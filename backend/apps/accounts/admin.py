from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["full_name", "email", "role", "company", "is_active", "created_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["full_name", "email", "company"]
    readonly_fields = ["id", "created_at", "updated_at"]
