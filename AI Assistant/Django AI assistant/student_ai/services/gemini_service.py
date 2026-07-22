from __future__ import annotations

import json
import re
from typing import Any

from student_ai.services.ai_service import SharedAIService


class GeminiDocumentService:
    """Provider wrapper so native Gemini file APIs can be swapped in later."""

    def __init__(self) -> None:
        self.ai = SharedAIService()

    def json_chat(self, system: str, user: str, *, fallback: dict[str, Any]) -> dict[str, Any]:
        reply = self.ai.chat(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )["reply"]
        return _parse_json(reply, fallback)


def _parse_json(reply: str, fallback: dict[str, Any]) -> dict[str, Any]:
    text = reply.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        text = fenced.group(1).strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else fallback
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(text[start : end + 1])
                return parsed if isinstance(parsed, dict) else fallback
            except json.JSONDecodeError:
                return fallback
    return fallback


def normalize_list(value: Any, *, limit: int = 25) -> list[str]:
    if isinstance(value, list):
        items = value
    elif isinstance(value, str):
        items = [part.strip() for part in re.split(r"[,;\n]", value)]
    else:
        items = []
    result: list[str] = []
    for item in items:
        if isinstance(item, dict):
            item = item.get("title") or item.get("name") or item.get("topic") or item.get("text")
        if item is None:
            continue
        text = str(item).strip()
        if text and text not in result:
            result.append(text[:255])
    return result[:limit]
