from __future__ import annotations

from rest_framework import serializers

from .models import NoteInsight, PYQInsight, StudyPlan, StudyPlanTask, StudentAIChatSession


class ChatCreateSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ChatMessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class ChatRenameSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)


class StudyPlanCreateSerializer(serializers.Serializer):
    weak_subject_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    weak_topics = serializers.ListField(child=serializers.CharField(), required=False)
    start_date = serializers.DateField()
    end_date = serializers.DateField()


class StudyPlanRegenerateSerializer(serializers.Serializer):
    from_date = serializers.DateField()


class StudyPlanTaskUpdateSerializer(serializers.Serializer):
    is_completed = serializers.BooleanField()


class StudyPlanTaskCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    description = serializers.CharField()
    estimated_duration_minutes = serializers.IntegerField(min_value=1)
    priority = serializers.ChoiceField(choices=["low", "medium", "high"])


class MarksPredictSerializer(serializers.Serializer):
    t1 = serializers.FloatField(min_value=0, max_value=25)
    t2 = serializers.FloatField(min_value=0, max_value=25)
    t3 = serializers.FloatField(min_value=0, max_value=25)
    subject_name = serializers.CharField(required=False, allow_blank=True)


class StudentAIChatSessionSerializer(serializers.ModelSerializer):
    chat_id = serializers.UUIDField(source="id")
    subject_id = serializers.UUIDField(source="subject_id", allow_null=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = StudentAIChatSession
        fields = ["chat_id", "title", "subject_id", "updated_at", "message_count"]

    def get_message_count(self, obj: StudentAIChatSession) -> int:
        return len(obj.conversation.messages or [])


class NoteInsightSerializer(serializers.ModelSerializer):
    note_id = serializers.UUIDField(source="note_id")
    flashcards = serializers.SerializerMethodField()

    class Meta:
        model = NoteInsight
        fields = [
            "note_id",
            "short_summary",
            "detailed_notes",
            "bullet_notes",
            "important_definitions",
            "key_formulae",
            "important_questions",
            "status",
            "flashcards",
        ]

    def get_flashcards(self, obj: NoteInsight) -> list[dict]:
        return [{"question": item.question, "answer": item.answer} for item in obj.note.flashcards.all()]


class StudyPlanTaskSerializer(serializers.ModelSerializer):
    task_id = serializers.UUIDField(source="id")
    date = serializers.DateField(source="task_date")
    subject_id = serializers.UUIDField(allow_null=True)
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = StudyPlanTask
        fields = [
            "task_id",
            "date",
            "subject_id",
            "subject_name",
            "description",
            "estimated_duration_minutes",
            "priority",
            "is_completed",
            "is_custom",
        ]

    def get_subject_name(self, obj: StudyPlanTask) -> str | None:
        return obj.subject.name if obj.subject else None


class StudyPlanSerializer(serializers.ModelSerializer):
    study_plan_id = serializers.UUIDField(source="id")
    semester_id = serializers.UUIDField(source="semester_id")
    tasks = StudyPlanTaskSerializer(many=True)

    class Meta:
        model = StudyPlan
        fields = ["study_plan_id", "student_id", "semester_id", "status", "tasks"]


class PYQInsightSerializer(serializers.ModelSerializer):
    pyq_id = serializers.UUIDField(source="pyq_file_id")
    subject_id = serializers.UUIDField(source="pyq_file.subject_id")

    class Meta:
        model = PYQInsight
        fields = ["pyq_id", "subject_id", "topics", "keywords", "difficulty", "marks_weightage", "question_types", "status"]
