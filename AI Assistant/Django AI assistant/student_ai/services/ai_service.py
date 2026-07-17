from __future__ import annotations

import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    pass


class SharedAIService:
    def __init__(self) -> None:
        self.base_url = os.getenv("FREELLMAPI_BASE_URL", "http://localhost:3001/v1").rstrip("/")
        self.api_key = os.getenv("FREELLMAPI_API_KEY", "")
        self.model = os.getenv("FREELLMAPI_MODEL", "auto")
        self.timeout = int(os.getenv("AI_TIMEOUT_SECONDS", "60"))
        self.max_retries = int(os.getenv("AI_MAX_RETRIES", "3"))
        self.retry_backoff = int(os.getenv("AI_RETRY_BACKOFF_SECONDS", "2"))

    def chat(self, messages: list[dict[str, str]], *, temperature: float = 0.2, response_format: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.api_key:
            raise AIServiceError("FREELLMAPI_API_KEY is not configured.")

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=self.timeout,
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "raw": data,
                    "reply": data["choices"][0]["message"]["content"],
                    "provider": response.headers.get("X-Routed-Via"),
                }
            except Exception as exc:
                last_error = exc
                logger.warning("AI request failed on attempt %s/%s: %s", attempt, self.max_retries, exc)
                if attempt < self.max_retries:
                    time.sleep(self.retry_backoff * attempt)
        raise AIServiceError(f"AI request failed after {self.max_retries} attempts: {last_error}")
