from rest_framework import serializers
from .models import Job


class JobSerializer(serializers.ModelSerializer):
    candidate_count = serializers.IntegerField(read_only=True, default=0)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id", "owner", "owner_name", "title", "department",
            "location", "description", "status", "candidate_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        return obj.owner.full_name if obj.owner_id else ""


class JobWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ["title", "department", "location", "description", "status"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be blank.")
        return value

    def validate_department(self, value):
        return value.strip()

    def validate_location(self, value):
        return value.strip()
