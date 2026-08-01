from __future__ import annotations

import json
from datetime import date, timedelta

from django.db.models import Q

from student_ai.models import CalendarEvent, StudyPlan, StudyPlanTask, Student, StudentEnrollment, Subject
from student_ai.services.ai_service import SharedAIService


NON_STUDY_EVENT_TYPES = {"HOLIDAY", "PUBLIC_HOLIDAY", "SEMESTER_BREAK", "EXAM"}


def _planner_context(student: Student) -> dict:
    enrollment = StudentEnrollment.objects.select_related("semester").get(student=student, is_current=True)
    return {
        "enrollment": enrollment,
        "subjects": list(
            Subject.objects.filter(
                university_id=student.university_id,
                semester_number=enrollment.semester.number,
                deleted_at__isnull=True,
                is_active=True,
            ).order_by("name")
        ),
        "phases": list(enrollment.semester.phases.order_by("number")),
        "events": list(
            CalendarEvent.objects.filter(
                Q(semester=enrollment.semester) | Q(semester__isnull=True, university_id=student.university_id),
                deleted_at__isnull=True,
            ).order_by("start_date")
        ),
    }


def _event_days(events: list[CalendarEvent], start: date, end: date) -> set[date]:
    blocked: set[date] = set()
    for event in events:
        if event.event_type.upper() not in NON_STUDY_EVENT_TYPES:
            continue
        cursor = max(start, event.start_date)
        while cursor <= min(end, event.end_date):
            blocked.add(cursor)
            cursor += timedelta(days=1)
    return blocked


def _next_exam_date(context: dict, start: date) -> date | None:
    dates = [phase.exam_date for phase in context["phases"] if phase.exam_date and phase.exam_date >= start]
    dates.extend(event.start_date for event in context["events"] if event.event_type.upper() == "EXAM" and event.start_date >= start)
    return min(dates) if dates else None


def _fallback_tasks(subjects: list[Subject], start: date, end: date, blocked_days: set[date]) -> list[dict]:
    tasks: list[dict] = []
    study_days = [start + timedelta(days=offset) for offset in range((end - start).days + 1) if start + timedelta(days=offset) not in blocked_days]
    for index, task_date in enumerate(study_days):
        if not subjects:
            break
        subject = subjects[index % len(subjects)]
        tasks.append({
            "date": task_date.isoformat(),
            "subject_code": subject.code,
            "description": f"Revise {subject.name} and practise weak areas before the examination.",
            "estimated_duration_minutes": 60,
            "priority": "high" if index < len(subjects) else "medium",
        })
    return tasks


def _duration_minutes(value: object) -> int:
    try:
        return max(30, min(int(value), 180))
    except (TypeError, ValueError):
        return 60


def generate_study_plan(plan: StudyPlan, *, weak_subject_ids: list[str], weak_topics: list[str], from_date: date | None = None) -> dict:
    context = _planner_context(plan.student)
    subjects = context["subjects"]
    start = max(from_date or plan.start_date, date.today())
    next_exam = _next_exam_date(context, start)
    end = min(plan.end_date, next_exam) if next_exam else plan.end_date
    if end < start:
        end = start
    blocked_days = _event_days(context["events"], start, end)
    blocked_days.update(phase.exam_date for phase in context["phases"] if phase.exam_date and start <= phase.exam_date <= end)
    study_days = [start + timedelta(days=offset) for offset in range((end - start).days + 1) if start + timedelta(days=offset) not in blocked_days]
    if from_date:
        plan.tasks.filter(task_date__gte=from_date, is_completed=False).delete()

    prompt = [
        {
            "role": "system",
            "content": (
                "Create a realistic day-by-day study planner for a university student. "
                "Prioritize weak topics, upcoming exams, remaining syllabus, revision, practice questions, and mock tests. "
                "Only use the supplied available_study_dates. Never schedule on a blocked holiday, semester break, or examination day. "
                "Use 30 to 180 minutes per task and schedule work before the nearest examination date. "
                "Return valid JSON array with keys: date, subject_code, description, estimated_duration_minutes, priority."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "semester": context["enrollment"].semester.number,
                    "date_range": {"start": str(start), "end": str(end)},
                    "nearest_exam_date": str(next_exam) if next_exam else None,
                    "available_study_dates": [str(day) for day in study_days],
                    "weak_subject_ids": weak_subject_ids,
                    "weak_topics": weak_topics,
                    "subjects": [{"id": str(subject.id), "code": subject.code, "name": subject.name} for subject in subjects],
                    "phases": [{"label": phase.label, "exam_date": phase.exam_date.isoformat() if phase.exam_date else None} for phase in context["phases"]],
                    "calendar_events": [{"title": event.title, "type": event.event_type, "start_date": str(event.start_date), "end_date": str(event.end_date)} for event in context["events"]],
                }
            ),
        },
    ]
    try:
        parsed = json.loads(SharedAIService().chat(prompt)["reply"])
    except Exception:
        parsed = []
    if not isinstance(parsed, list):
        parsed = []
    accepted_dates = {str(day) for day in study_days}
    valid_tasks = []
    for item in parsed:
        if not isinstance(item, dict) or str(item.get("date")) not in accepted_dates:
            continue
        subject = next((obj for obj in subjects if obj.code == item.get("subject_code")), None)
        if subject is None:
            continue
        valid_tasks.append({
            "subject": subject,
            "date": item["date"],
            "description": str(item.get("description") or "Revise the assigned topic.")[:1000],
            "estimated_duration_minutes": _duration_minutes(item.get("estimated_duration_minutes", 60)),
            "priority": str(item.get("priority") or "medium").lower(),
        })
    if not valid_tasks:
        valid_tasks = [
            {"subject": next((obj for obj in subjects if obj.code == item["subject_code"]), None), **item}
            for item in _fallback_tasks(subjects, start, end, blocked_days)
        ]
    for item in valid_tasks:
        if item["subject"] is None:
            continue
        StudyPlanTask.objects.create(
            study_plan=plan,
            subject=item["subject"],
            task_date=item["date"],
            description=item["description"],
            estimated_duration_minutes=item["estimated_duration_minutes"],
            priority=item["priority"] if item["priority"] in {"low", "medium", "high"} else "medium",
            is_custom=False,
        )
    plan.status = "completed"
    plan.regenerated_from = from_date
    plan.start_date = start
    plan.end_date = end
    plan.save(update_fields=["status", "regenerated_from", "start_date", "end_date", "updated_at"])
    return {"study_plan_id": str(plan.id), "status": "completed"}
