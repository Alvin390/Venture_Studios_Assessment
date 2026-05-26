from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from config.permissions import IsAuthenticated
from config.utils import get_effective_profile
from .models import Candidate, CandidateActivity
from .serializers import (
    CandidateSerializer,
    CandidateListSerializer,
    CandidateWriteSerializer,
    KanbanCandidateSerializer,
    StageUpdateSerializer,
)

ALL_STAGES = [
    Candidate.STAGE_APPLIED,
    Candidate.STAGE_SCREENING,
    Candidate.STAGE_INTERVIEW,
    Candidate.STAGE_TECHNICAL,
    Candidate.STAGE_OFFER,
    Candidate.STAGE_HIRED,
    Candidate.STAGE_REJECTED,
]


def _base_qs(profile):
    qs = Candidate.objects.select_related("job", "owner")
    if not profile.is_admin:
        qs = qs.filter(owner=profile)
    return qs


class CandidateListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _build_queryset(self, request):
        effective = get_effective_profile(request)
        qs = _base_qs(effective if not request.profile.is_admin or request.query_params.get("as_user") else request.profile)

        if not request.profile.is_admin or request.query_params.get("as_user"):
            qs = qs.filter(owner=effective)

        job_id = request.query_params.get("job_id")
        if job_id:
            qs = qs.filter(job_id=job_id)

        stage = request.query_params.get("stage")
        if stage:
            qs = qs.filter(stage=stage)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search)
            )

        return qs.order_by("-created_at")

    @extend_schema(
        summary="List candidates",
        description="Returns candidates visible to the caller with optional filters.",
        tags=["Candidates"],
        parameters=[
            OpenApiParameter("job_id", OpenApiTypes.UUID, description="Filter by job ID.", required=False),
            OpenApiParameter("stage", OpenApiTypes.STR, enum=["applied", "screening", "interview", "technical", "offer", "hired", "rejected"], required=False),
            OpenApiParameter("search", OpenApiTypes.STR, description="Filter by name or email.", required=False),
            OpenApiParameter("as_user", OpenApiTypes.UUID, description="Admin only: scope to a specific customer.", required=False),
        ],
        responses={200: CandidateListSerializer(many=True)},
    )
    def get(self, request):
        qs = self._build_queryset(request)
        serializer = CandidateListSerializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    @extend_schema(
        summary="Add a candidate",
        description="Creates a new candidate and logs an `created` activity.",
        tags=["Candidates"],
        request=CandidateWriteSerializer,
        responses={201: CandidateSerializer},
    )
    def post(self, request):
        effective = get_effective_profile(request)
        serializer = CandidateWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        candidate = serializer.save(owner=effective)

        CandidateActivity.objects.create(
            candidate=candidate,
            actor=request.profile,
            action=CandidateActivity.ACTION_CREATED,
            metadata={"stage": candidate.stage},
        )

        candidate.refresh_from_db()
        return Response(
            CandidateSerializer(candidate).data,
            status=status.HTTP_201_CREATED,
        )


class CandidateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_candidate(self, request, pk):
        try:
            qs = Candidate.objects.select_related("job", "owner").prefetch_related(
                "activities__actor"
            )
            candidate = qs.get(pk=pk)
        except Candidate.DoesNotExist:
            return None
        if not request.profile.is_admin and candidate.owner_id != request.profile.id:
            return None
        return candidate

    @extend_schema(
        summary="Get a candidate",
        description="Returns full candidate detail including activities and AI evaluation results.",
        tags=["Candidates"],
        responses={200: CandidateSerializer, 404: None},
    )
    def get(self, request, pk):
        candidate = self._get_candidate(request, pk)
        if not candidate:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CandidateSerializer(candidate).data)

    @extend_schema(
        summary="Update a candidate",
        description="Partial update. Updating `notes` logs a `note_added` activity.",
        tags=["Candidates"],
        request=CandidateWriteSerializer,
        responses={200: CandidateSerializer, 404: None},
    )
    def patch(self, request, pk):
        candidate = self._get_candidate(request, pk)
        if not candidate:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CandidateWriteSerializer(candidate, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        old_notes = candidate.notes
        serializer.save()

        if "notes" in request.data and request.data["notes"] != old_notes:
            CandidateActivity.objects.create(
                candidate=candidate,
                actor=request.profile,
                action=CandidateActivity.ACTION_NOTE_ADDED,
                metadata={},
            )

        candidate.refresh_from_db()
        return Response(CandidateSerializer(candidate).data)

    @extend_schema(
        summary="Delete a candidate",
        tags=["Candidates"],
        responses={204: None, 404: None},
    )
    def delete(self, request, pk):
        candidate = self._get_candidate(request, pk)
        if not candidate:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)
        candidate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CandidateStageMoveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Move candidate to a new stage",
        description=(
            "Updates the candidate's pipeline stage and logs a `stage_change` activity "
            "with `{from, to}` metadata. No-op if the stage is unchanged."
        ),
        tags=["Candidates"],
        request=StageUpdateSerializer,
        responses={200: CandidateListSerializer, 404: None},
    )
    def patch(self, request, pk):
        try:
            candidate = Candidate.objects.select_related("job", "owner").get(pk=pk)
        except Candidate.DoesNotExist:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)

        if not request.profile.is_admin and candidate.owner_id != request.profile.id:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = StageUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_stage = candidate.stage
        new_stage = serializer.validated_data["stage"]

        if old_stage == new_stage:
            return Response(CandidateListSerializer(candidate).data)

        candidate.stage = new_stage
        candidate.save(update_fields=["stage", "updated_at"])

        CandidateActivity.objects.create(
            candidate=candidate,
            actor=request.profile,
            action=CandidateActivity.ACTION_STAGE_CHANGE,
            metadata={"from": old_stage, "to": new_stage},
        )

        return Response(CandidateListSerializer(candidate).data)


class KanbanView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get kanban board",
        description=(
            "Returns all candidates grouped by stage in a single query. "
            "Structure: `{stages: {stage_name: {count, candidates[]}}}`."
        ),
        tags=["Candidates"],
        parameters=[
            OpenApiParameter("job_id", OpenApiTypes.UUID, description="Filter all columns by job.", required=False),
            OpenApiParameter("as_user", OpenApiTypes.UUID, description="Admin only: scope to a specific customer.", required=False),
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "stages": {
                        "type": "object",
                        "additionalProperties": {
                            "type": "object",
                            "properties": {
                                "count": {"type": "integer"},
                                "candidates": {"type": "array", "items": {}},
                            },
                        },
                    }
                },
            }
        },
    )
    def get(self, request):
        effective = get_effective_profile(request)

        qs = Candidate.objects.select_related("job")
        if not request.profile.is_admin or request.query_params.get("as_user"):
            qs = qs.filter(owner=effective)

        job_id = request.query_params.get("job_id")
        if job_id:
            qs = qs.filter(job_id=job_id)

        all_candidates = list(qs.order_by("created_at"))
        serialized = KanbanCandidateSerializer(all_candidates, many=True).data

        stages = {s: {"count": 0, "candidates": []} for s in ALL_STAGES}
        for item in serialized:
            s = item["stage"]
            if s in stages:
                stages[s]["candidates"].append(item)
                stages[s]["count"] += 1

        return Response({"stages": stages})
