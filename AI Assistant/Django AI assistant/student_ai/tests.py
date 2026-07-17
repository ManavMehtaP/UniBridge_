from __future__ import annotations

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Note, Phase, Result, Semester, Student, StudentEnrollment, StudyPlan, Subject


@override_settings(ROOT_URLCONF="unibridge_ai.urls")
class StudentAiApiTests(TestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(username="tester", password="secret123")
        self.client.force_authenticate(user=self.user)

        self.student = Student.objects.create(
            id=uuid4(),
            university_id=uuid4(),
            enrollment_no="LJ20IT001",
            name="Test Student",
            email="student@example.com",
            password_hash="hash",
            branch="IT",
            admission_year=2023,
        )
        self.semester = Semester.objects.create(
            id=uuid4(),
            university_id=self.student.university_id,
            academic_year_id=uuid4(),
            number=4,
            label="Semester 4",
            year_level="SY",
            status="ACTIVE",
            start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
            phase_count=4,
        )
        self.subject = Subject.objects.create(
            id=uuid4(),
            university_id=self.student.university_id,
            semester=self.semester,
            code="OS",
            name="Operating System",
            credits=4,
            type="THEORY",
        )
        self.enrollment = StudentEnrollment.objects.create(
            id=uuid4(),
            student=self.student,
            semester=self.semester,
            batch_id=uuid4(),
            roll_no="IT-24-001",
            year_level="SY",
            is_current=True,
        )
        for number, label, marks in [(1, "T1", 18), (2, "T2", 20), (3, "T3", 21)]:
            phase = Phase.objects.create(
                id=uuid4(),
                semester=self.semester,
                label=label,
                number=number,
                start_date=datetime(2026, number, 1, tzinfo=timezone.utc),
                end_date=datetime(2026, number, 10, tzinfo=timezone.utc),
                exam_date=datetime(2026, number, 10, tzinfo=timezone.utc),
            )
            Result.objects.create(
                id=uuid4(),
                enrollment=self.enrollment,
                phase=phase,
                subject=self.subject,
                marks_obtained=marks,
                max_marks=25,
                uploaded_by_id=uuid4(),
                is_published=True,
            )
        self.headers = {"HTTP_X_STUDENT_ID": str(self.student.id)}

    @patch("student_ai.services.ai_service.SharedAIService.chat")
    def test_chat_flow(self, mock_chat):
        mock_chat.return_value = {"reply": "Deadlock prevention avoids circular wait."}
        create_response = self.client.post("/api/v1/student-ai/chats", {"title": "OS Chat"}, format="json", **self.headers)
        self.assertEqual(create_response.status_code, 201)
        chat_id = create_response.json()["data"]["chat_id"]
        reply_response = self.client.post(f"/api/v1/student-ai/chats/{chat_id}/messages", {"message": "Explain deadlock prevention."}, format="json", **self.headers)
        self.assertEqual(reply_response.status_code, 200)

    @patch("student_ai.services.ai_service.SharedAIService.chat")
    def test_note_queue_flow(self, mock_chat):
        with tempfile.TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "os.txt"
            file_path.write_text("Deadlock prevention and banker algorithm.")
            note = Note.objects.create(
                id=uuid4(),
                subject=self.subject,
                faculty_id=uuid4(),
                title="OS Unit 3",
                file_url=str(file_path),
                file_key="os.txt",
                mime_type="text/plain",
            )
            mock_chat.return_value = {
                "reply": '{"short_summary":"summary","detailed_notes":"details","bullet_notes":["b1"],"important_definitions":[],"key_formulae":[],"flashcards":[],"important_questions":["Explain deadlock"]}'
            }
            response = self.client.get(f"/api/v1/student-ai/notes/{note.id}", **self.headers)
            self.assertEqual(response.status_code, 202)

    def test_marks_prediction_endpoint(self):
        response = self.client.get("/api/v1/student-ai/students/me/marks/prediction", **self.headers)
        self.assertIn(response.status_code, {200, 404})

    def test_custom_task_crud(self):
        plan = StudyPlan.objects.create(
            student=self.student,
            enrollment=self.enrollment,
            semester=self.semester,
            weak_subject_ids=[str(self.subject.id)],
            weak_topics=["Deadlock"],
            start_date="2026-07-10",
            end_date="2026-07-20",
            status="completed",
        )
        create_response = self.client.post(
            f"/api/v1/student-ai/study-plans/{plan.id}/tasks",
            {
                "date": "2026-07-12",
                "subject_id": str(self.subject.id),
                "description": "Revise unit 2",
                "estimated_duration_minutes": 45,
                "priority": "medium",
            },
            format="json",
            **self.headers,
        )
        self.assertEqual(create_response.status_code, 201)
        task_id = create_response.json()["data"]["task_id"]
        patch_response = self.client.patch(f"/api/v1/student-ai/study-plans/tasks/{task_id}", {"is_completed": True}, format="json", **self.headers)
        self.assertEqual(patch_response.status_code, 200)
