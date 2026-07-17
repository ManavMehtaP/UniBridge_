from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings

from student_ai.models import Flashcard, Note, NoteInsight
from student_ai.services.ai_service import SharedAIService
from student_ai.services.documents import extract_text, file_hash


def resolve_local_path(file_url: str, file_key: str) -> Path:
    candidate = Path(file_url)
    if candidate.exists():
        return candidate
    return Path(settings.MEDIA_ROOT) / file_key


def generate_note_insight(note: Note) -> dict:
    path = resolve_local_path(note.file_url, note.file_key)
    extracted = extract_text(path)
    content_digest = file_hash(path)
    current = NoteInsight.objects.filter(note=note).first()
    if current and current.content_hash == content_digest:
        return {"note_id": str(note.id), "status": "cached"}

    prompt = [
        {
            "role": "system",
            "content": (
                "Generate student study material and return valid JSON with keys: "
                "short_summary, detailed_notes, bullet_notes, important_definitions, "
                "key_formulae, flashcards, important_questions."
            ),
        },
        {"role": "user", "content": extracted[:18000]},
    ]
    parsed = json.loads(SharedAIService().chat(prompt)["reply"])
    insight, _ = NoteInsight.objects.update_or_create(
        note=note,
        defaults={
            "content_hash": content_digest,
            "extracted_text": extracted[:50000],
            "short_summary": parsed.get("short_summary", ""),
            "detailed_notes": parsed.get("detailed_notes", ""),
            "bullet_notes": parsed.get("bullet_notes", []),
            "important_definitions": parsed.get("important_definitions", []),
            "key_formulae": parsed.get("key_formulae", []),
            "important_questions": parsed.get("important_questions", []),
            "status": "completed",
        },
    )
    note.ai_summary = insight.short_summary
    note.save(update_fields=["ai_summary", "updated_at"])
    Flashcard.objects.filter(note=note).delete()
    for index, item in enumerate(parsed.get("flashcards", [])):
        Flashcard.objects.create(note=note, question=item.get("question", ""), answer=item.get("answer", ""), order=index)
    return {"note_id": str(note.id), "status": "completed"}
