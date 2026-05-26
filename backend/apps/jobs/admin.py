from django.contrib import admin
from .models import Job


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "department", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["title", "department", "owner__full_name"]
    readonly_fields = ["id", "created_at", "updated_at"]
