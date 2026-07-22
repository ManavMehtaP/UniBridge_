from __future__ import annotations

from student_ai.models import CalendarEvent, StudyPlan, Student, StudentEnrollment, Subject
from student_ai.services.retrieval_service import retrieve_subject_context


def get_student_context(student: Student) -> dict:
    enrollment = StudentEnrollment.objects.select_related("semester").filter(student=student, is_current=True).first()
    subjects = list(
        Subject.objects.filter(
            university_id=student.university_id,
            semester_number=enrollment.semester.number,
            deleted_at__isnull=True,
            is_active=True,
        )
    ) if enrollment else []
    events = list(CalendarEvent.objects.filter(semester=enrollment.semester).order_by("start_date")[:10]) if enrollment else []
    latest_plan = StudyPlan.objects.filter(student=student).prefetch_related("tasks__subject").order_by("-created_at").first()
    return {
        "student": {
            "id": str(student.id),
            "name": student.name,
            "enrollment_no": student.enrollment_no,
            "branch": student.branch,
        },
        "current_enrollment": {
            "semester_id": str(enrollment.semester_id),
            "semester_number": enrollment.semester.number,
            "year_level": enrollment.year_level,
            "roll_no": enrollment.roll_no,
        } if enrollment else None,
        "subjects": [{"id": str(subject.id), "code": subject.code, "name": subject.name} for subject in subjects],
        "calendar_events": [{"title": event.title, "event_type": event.event_type, "start_date": str(event.start_date), "end_date": str(event.end_date)} for event in events],
        "study_plan": {
            "status": latest_plan.status,
            "start_date": str(latest_plan.start_date),
            "end_date": str(latest_plan.end_date),
            "completed_tasks": sum(1 for task in latest_plan.tasks.all() if task.is_completed),
            "pending_tasks": sum(1 for task in latest_plan.tasks.all() if not task.is_completed),
            "recent_tasks": [
                {
                    "date": str(task.task_date),
                    "subject": task.subject.code if task.subject else None,
                    "description": task.description,
                    "is_completed": task.is_completed,
                    "is_custom": task.is_custom,
                }
                for task in list(latest_plan.tasks.all())[:12]
            ],
        } if latest_plan else None,
    }


def build_chat_sources(student: Student, subject: Subject | None = None, query: str = "") -> tuple[str, list[dict]]:
    return retrieve_subject_context(student, subject, query)
