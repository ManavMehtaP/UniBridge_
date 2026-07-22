from django.contrib import admin

from .models import (
    AIDocument,
    AIDocumentChunk,
    AIDocumentMetadata,
    BackgroundJob,
    NoteInsight,
    PYQInsight,
    PYQQuestion,
    StudyPlan,
    StudyPlanTask,
    StudentAIChatSession,
)

admin.site.register(StudentAIChatSession)
admin.site.register(NoteInsight)
admin.site.register(StudyPlan)
admin.site.register(StudyPlanTask)
admin.site.register(PYQInsight)
admin.site.register(AIDocument)
admin.site.register(AIDocumentChunk)
admin.site.register(AIDocumentMetadata)
admin.site.register(PYQQuestion)
admin.site.register(BackgroundJob)
