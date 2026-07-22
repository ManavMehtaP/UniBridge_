from __future__ import annotations

import os

from django.http import HttpResponse


def _allowed_origins() -> set[str]:
    raw = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return {item.strip() for item in raw.split(",") if item.strip()}


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if origin in _allowed_origins():
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Student-Id,X-Service-Token"
            response["Access-Control-Max-Age"] = "86400"

        return response
