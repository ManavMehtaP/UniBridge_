from django.contrib import admin

from .models import BackgroundJob, NoteInsight, PYQInsight, StudyPlan, StudyPlanTask, StudentAIChatSession

admin.site.register(StudentAIChatSession)
admin.site.register(NoteInsight)
admin.site.register(StudyPlan)
admin.site.register(StudyPlanTask)
admin.site.register(PYQInsight)
admin.site.register(BackgroundJob)
