import uuid
from django.db import models


class Candidate(models.Model):
    STAGE_APPLIED = "applied"
    STAGE_SCREENING = "screening"
    STAGE_INTERVIEW = "interview"
    STAGE_TECHNICAL = "technical"
    STAGE_OFFER = "offer"
    STAGE_HIRED = "hired"
    STAGE_REJECTED = "rejected"

    STAGE_CHOICES = [
        (STAGE_APPLIED, "Applied"),
        (STAGE_SCREENING, "Screening"),
        (STAGE_INTERVIEW, "Interview"),
        (STAGE_TECHNICAL, "Technical"),
        (STAGE_OFFER, "Offer"),
        (STAGE_HIRED, "Hired"),
        (STAGE_REJECTED, "Rejected"),
    ]

    # Ordered list used for progress display on the frontend
    STAGE_ORDER = [
        STAGE_APPLIED,
        STAGE_SCREENING,
        STAGE_INTERVIEW,
        STAGE_TECHNICAL,
        STAGE_OFFER,
        STAGE_HIRED,
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        "accounts.Profile",
        on_delete=models.CASCADE,
        related_name="candidates",
    )
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidates",
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    linkedin_url = models.URLField(max_length=500, blank=True)
    cv_url = models.URLField(max_length=500, blank=True)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default=STAGE_APPLIED)
    notes = models.TextField(blank=True)
    ai_score = models.IntegerField(null=True, blank=True)
    ai_summary = models.TextField(blank=True)
    ai_verdict = models.CharField(max_length=50, blank=True)
    ai_evaluated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "candidates"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "stage"]),
            models.Index(fields=["job"]),
        ]

    def __str__(self):
        return f"{self.full_name} - {self.stage}"


class CandidateActivity(models.Model):
    ACTION_STAGE_CHANGE = "stage_change"
    ACTION_NOTE_ADDED = "note_added"
    ACTION_AI_EVALUATED = "ai_evaluated"
    ACTION_CREATED = "created"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    actor = models.ForeignKey(
        "accounts.Profile",
        on_delete=models.CASCADE,
    )
    action = models.CharField(max_length=100)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "candidate_activity"
        ordering = ["-created_at"]
