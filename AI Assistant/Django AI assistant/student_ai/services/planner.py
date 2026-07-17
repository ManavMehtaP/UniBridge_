from __future__ import annotations

import json
from datetime import date

from student_ai.models import CalendarEvent, StudyPlan, StudyPlanTask, Student, StudentEnrollment, Subject
from student_ai.services.ai_service import SharedAIService


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
        "events": list(CalendarEvent.objects.filter(semester=enrollment.semester, deleted_at__isnull=True).order_by("start_date")),
    }


def generate_study_plan(plan: StudyPlan, *, weak_subject_ids: list[str], weak_topics: list[str], from_date: date | None = None) -> dict:
    context = _planner_context(plan.student)
    subjects = context["subjects"]
    if from_date:
        plan.tasks.filter(task_date__gte=from_date, is_completed=False).delete()

    prompt = [
        {
            "role": "system",
            "content": (
                "Create a realistic day-by-day study planner for a university student. "
                "Prioritize weak topics, upcoming exams, remaining syllabus, revision, practice questions, and mock tests. "
                "Return valid JSON array with keys: date, subject_code, description, estimated_duration_minutes, priority."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "semester": context["enrollment"].semester.number,
                    "date_range": {"start": str(from_date or plan.start_date), "end": str(plan.end_date)},
                    "weak_subject_ids": weak_subject_ids,
                    "weak_topics": weak_topics,
                    "subjects": [{"id": str(subject.id), "code": subject.code, "name": subject.name} for subject in subjects],
                    "phases": [{"label": phase.label, "exam_date": phase.exam_date.isoformat() if phase.exam_date else None} for phase in context["phases"]],
                    "calendar_events": [{"title": event.title, "type": event.event_type, "start_date": str(event.start_date), "end_date": str(event.end_date)} for event in context["events"]],
                }
            ),
        },
    ]
    parsed = json.loads(SharedAIService().chat(prompt)["reply"])
    for item in parsed:
        subject = next((obj for obj in subjects if obj.code == item.get("subject_code")), None)
        StudyPlanTask.objects.create(
            study_plan=plan,
            subject=subject,
            task_date=item["date"],
            description=item["description"],
            estimated_duration_minutes=item.get("estimated_duration_minutes", 60),
            priority=item.get("priority", "medium"),
            is_custom=False,
        )
    plan.status = "completed"
    plan.regenerated_from = from_date
    plan.save(update_fields=["status", "regenerated_from", "updated_at"])
    return {"study_plan_id": str(plan.id), "status": "completed"}
