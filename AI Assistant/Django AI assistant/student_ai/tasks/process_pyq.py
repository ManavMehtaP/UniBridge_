from __future__ import annotations

from student_ai.models import PYQFile
from student_ai.services.pyq_service import process_pyq_document


def process_pyq(pyq_id: str) -> dict:
    return process_pyq_document(PYQFile.objects.select_related("subject").get(pk=pyq_id))
