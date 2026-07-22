from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class SemanticChunk:
    index: int
    content: str
    unit_name: str | None = None
    chapter_name: str | None = None
    page_number: int | None = None

    @property
    def token_count(self) -> int:
        return max(1, int(len(self.content.split()) * 1.3))


HEADING_RE = re.compile(r"^(unit|module|chapter)\s*[-:\d.ivx]*\s*(.*)$", re.IGNORECASE)


def build_semantic_chunks(text: str, *, min_words: int = 400, max_words: int = 800) -> list[SemanticChunk]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n+", text) if part.strip()]
    chunks: list[SemanticChunk] = []
    buffer: list[str] = []
    unit_name: str | None = None
    chapter_name: str | None = None

    def flush() -> None:
        nonlocal buffer
        if not buffer:
            return
        content = "\n\n".join(buffer).strip()
        if content:
            chunks.append(SemanticChunk(len(chunks), content, unit_name, chapter_name))
        buffer = []

    for paragraph in paragraphs:
        first_line = paragraph.splitlines()[0].strip()
        heading = HEADING_RE.match(first_line)
        if heading:
            label = heading.group(1).lower()
            title = (heading.group(2) or first_line).strip()[:255]
            current_words = sum(len(item.split()) for item in buffer)
            if current_words >= min_words:
                flush()
            if label in {"unit", "module"}:
                unit_name = title
            else:
                chapter_name = title

        next_words = len(paragraph.split())
        current_words = sum(len(item.split()) for item in buffer)
        if buffer and current_words + next_words > max_words:
            flush()
        buffer.append(paragraph)

    flush()

    if not chunks and text.strip():
        chunks.append(SemanticChunk(0, text.strip()[:8000], unit_name, chapter_name))
    return chunks
