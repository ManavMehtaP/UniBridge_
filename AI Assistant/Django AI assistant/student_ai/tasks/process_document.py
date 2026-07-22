from __future__ import annotations

from student_ai.models import Note
from student_ai.services.ingestion_service import process_note_document


def process_document(note_id: str) -> dict:
    return process_note_document(Note.objects.select_related("subject").get(pk=note_id))
