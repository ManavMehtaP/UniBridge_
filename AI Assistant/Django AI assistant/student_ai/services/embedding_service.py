from __future__ import annotations

import hashlib
import math
import re

from student_ai.models import AIDocumentChunk, Subject

WORD_RE = re.compile(r"[a-zA-Z0-9]+")


class EmbeddingService:
    """Deterministic placeholder until a vector database/provider is added."""

    dimensions = 48

    def generate_embedding(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        for word in WORD_RE.findall(text.lower()):
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            index = digest[0] % self.dimensions
            vector[index] += 1.0
        norm = math.sqrt(sum(item * item for item in vector)) or 1.0
        return [round(item / norm, 6) for item in vector]

    def search_similar_chunks(self, subject: Subject, query: str, *, limit: int = 6) -> list[AIDocumentChunk]:
        terms = set(WORD_RE.findall(query.lower()))
        if not terms:
            return []
        scored: list[tuple[int, AIDocumentChunk]] = []
        for chunk in AIDocumentChunk.objects.filter(subject=subject, document__processing_status="completed").select_related("document")[:500]:
            haystack = " ".join([chunk.content, chunk.summary, " ".join(chunk.keywords or [])]).lower()
            score = sum(1 for term in terms if term in haystack)
            if score:
                scored.append((score, chunk))
        scored.sort(key=lambda item: (-item[0], item[1].document.title, item[1].chunk_index))
        return [chunk for _score, chunk in scored[:limit]]
