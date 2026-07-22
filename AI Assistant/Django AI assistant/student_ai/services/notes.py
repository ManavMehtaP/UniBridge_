from __future__ import annotations

from student_ai.models import Note
from student_ai.services.ingestion_service import process_note_document, resolve_local_path


def generate_note_insight(note: Note) -> dict:
    return process_note_document(note)
