from django.contrib import admin
from .models import Candidate, CandidateActivity


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ["full_name", "email", "owner", "job", "stage", "ai_score", "created_at"]
    list_filter = ["stage"]
    search_fields = ["full_name", "email", "owner__full_name"]
    readonly_fields = ["id", "ai_score", "ai_summary", "ai_verdict", "ai_evaluated_at", "created_at", "updated_at"]


@admin.register(CandidateActivity)
class CandidateActivityAdmin(admin.ModelAdmin):
    list_display = ["candidate", "actor", "action", "created_at"]
    list_filter = ["action"]
    readonly_fields = ["id", "created_at"]
