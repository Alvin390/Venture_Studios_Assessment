from rest_framework import serializers
from django.core.validators import URLValidator
from .models import Candidate, CandidateActivity


class CandidateActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = CandidateActivity
        fields = ["id", "action", "actor_name", "metadata", "created_at"]

    def get_actor_name(self, obj) -> str:
        return obj.actor.full_name if obj.actor_id else "System"


class CandidateSerializer(serializers.ModelSerializer):
    job_title = serializers.SerializerMethodField()
    activities = CandidateActivitySerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = [
            "id", "owner", "job", "job_title",
            "full_name", "email", "phone",
            "linkedin_url", "cv_url",
            "stage", "notes",
            "ai_score", "ai_summary", "ai_verdict",
            "ai_strengths", "ai_gaps", "ai_interview_questions",
            "ai_evaluated_at",
            "created_at", "updated_at",
            "activities",
        ]
        read_only_fields = [
            "id", "owner", "ai_score", "ai_summary",
            "ai_verdict", "ai_strengths", "ai_gaps", "ai_interview_questions",
            "ai_evaluated_at", "created_at", "updated_at",
        ]

    def get_job_title(self, obj) -> str | None:
        return obj.job.title if obj.job_id else None


class CandidateListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views - excludes activities and long text fields."""
    job_title = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            "id", "owner", "job", "job_title",
            "full_name", "email", "phone",
            "linkedin_url", "stage",
            "ai_score", "ai_verdict",
            "created_at", "updated_at",
        ]

    def get_job_title(self, obj) -> str | None:
        return obj.job.title if obj.job_id else None


class KanbanCandidateSerializer(serializers.ModelSerializer):
    """Minimal serializer for kanban cards - only what the card needs to display."""
    job_title = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            "id", "full_name", "email",
            "job", "job_title",
            "stage", "linkedin_url",
            "ai_score", "ai_verdict",
            "created_at",
        ]

    def get_job_title(self, obj) -> str | None:
        return obj.job.title if obj.job_id else None


class CandidateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = [
            "job", "full_name", "email", "phone",
            "linkedin_url", "cv_url", "stage", "notes",
        ]

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be blank.")
        return value

    def validate_linkedin_url(self, value):
        if not value:
            return value
        value = value.strip()
        if value and "linkedin.com" not in value.lower():
            raise serializers.ValidationError(
                "Please enter a valid LinkedIn profile URL."
            )
        # Ensure the URL has a scheme
        if value and not value.startswith("http"):
            value = "https://" + value
        URLValidator()(value)
        return value

    def validate_cv_url(self, value):
        if value:
            value = value.strip()
            if not value.startswith("http"):
                value = "https://" + value
            URLValidator()(value)
        return value

    def validate_email(self, value):
        return value.lower().strip() if value else value

    def validate_phone(self, value):
        return value.strip() if value else value


class StageUpdateSerializer(serializers.Serializer):
    stage = serializers.ChoiceField(choices=Candidate.STAGE_CHOICES)
