from __future__ import annotations

from collections import Counter

from student_ai.models import CalendarEvent, Note, NoteInsight, PYQAnalysis, PYQFile, Student, StudentEnrollment, Subject


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
    }


def build_chat_sources(student: Student, subject: Subject | None = None) -> tuple[str, list[dict]]:
    note_qs = Note.objects.filter(deleted_at__isnull=True)
    pyq_qs = PYQFile.objects.all()
    analysis_qs = PYQAnalysis.objects.all()
    if subject:
        note_qs = note_qs.filter(subject=subject)
        pyq_qs = pyq_qs.filter(subject=subject)
        analysis_qs = analysis_qs.filter(subject=subject)

    note_insights = NoteInsight.objects.filter(note__in=note_qs).select_related("note")[:5]
    pyqs = list(pyq_qs.order_by("-created_at")[:5])
    topic_counter: Counter[str] = Counter()
    for analysis in analysis_qs[:5]:
        topic_counter.update(analysis.topic_frequencies or {})

    chunks: list[str] = []
    sources: list[dict] = []
    for insight in note_insights:
        chunks.append(f"Note: {insight.note.title}\nSummary: {insight.short_summary}\nDetails: {insight.detailed_notes[:1000]}")
        sources.append({"type": "note", "id": str(insight.note_id), "title": insight.note.title})
    for pyq in pyqs:
        chunks.append(f"PYQ Year: {pyq.year}\nReference: {pyq.file_key}")
        sources.append({"type": "pyq", "id": str(pyq.id), "year": pyq.year})
    if topic_counter:
        chunks.append(f"PYQ frequency hints: {dict(topic_counter.most_common(10))}")
    return "\n\n".join(chunks), sources
