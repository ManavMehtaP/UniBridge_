from __future__ import annotations

from student_ai.models import Student, StudyPlan, Subject
from student_ai.services.embedding_service import EmbeddingService


def retrieve_subject_context(student: Student, subject: Subject | None, query: str) -> tuple[str, list[dict]]:
    chunks: list[str] = []
    sources: list[dict] = []
    if subject:
        for chunk in EmbeddingService().search_similar_chunks(subject, query):
            title = chunk.document.title
            location = ", ".join(part for part in [chunk.unit_name, chunk.chapter_name, f"page {chunk.page_number}" if chunk.page_number else None] if part)
            chunks.append(
                f"Source: {title}\n"
                f"Location: {location or 'not specified'}\n"
                f"Content:\n{chunk.content[:2400]}"
            )
            sources.append(
                {
                    "type": chunk.document.source_type,
                    "document_id": str(chunk.document_id),
                    "chunk_id": str(chunk.id),
                    "title": title,
                    "unit": chunk.unit_name,
                    "chapter": chunk.chapter_name,
                    "page": chunk.page_number,
                }
            )

    latest_plan = StudyPlan.objects.filter(student=student).prefetch_related("tasks__subject").order_by("-created_at").first()
    if latest_plan:
        pending = [task for task in latest_plan.tasks.all() if not task.is_completed][:6]
        completed = [task for task in latest_plan.tasks.all() if task.is_completed][:6]
        if pending:
            chunks.append("Pending planner work:\n" + "\n".join(f"- {task.task_date}: {task.description}" for task in pending))
        if completed:
            chunks.append("Completed planner work:\n" + "\n".join(f"- {task.task_date}: {task.description}" for task in completed))

    return "\n\n".join(chunks), sources
