import os

from django.conf import settings
from rest_framework.permissions import BasePermission


class IsStudentScope(BasePermission):
    message = "Student context is required."

    def has_permission(self, request, view) -> bool:
        return bool(getattr(request.user, "is_authenticated", False) or request.headers.get("X-Student-Id"))


class InternalServicePermission(BasePermission):
    message = "Valid service token is required."

    def has_permission(self, request, view) -> bool:
        expected = os.getenv("SERVICE_TOKEN") or os.getenv("DJANGO_AI_SERVICE_TOKEN")
        if not expected:
            return bool(settings.DEBUG)
        return request.headers.get("X-Service-Token") == expected
