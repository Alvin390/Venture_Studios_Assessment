from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils.timezone import now

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
    """All candidates visible to this profile, with related data pre-fetched."""
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

    def get(self, request):
        qs = self._build_queryset(request)
        serializer = CandidateListSerializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})

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

    def get(self, request, pk):
        candidate = self._get_candidate(request, pk)
        if not candidate:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CandidateSerializer(candidate).data)

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

    def delete(self, request, pk):
        candidate = self._get_candidate(request, pk)
        if not candidate:
            return Response({"error": "Candidate not found."}, status=status.HTTP_404_NOT_FOUND)
        candidate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CandidateStageMoveView(APIView):
    permission_classes = [IsAuthenticated]

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

    def get(self, request):
        effective = get_effective_profile(request)

        qs = Candidate.objects.select_related("job")
        if not request.profile.is_admin or request.query_params.get("as_user"):
            qs = qs.filter(owner=effective)

        job_id = request.query_params.get("job_id")
        if job_id:
            qs = qs.filter(job_id=job_id)

        # Single DB query - group in Python (fast enough for any realistic ATS dataset)
        all_candidates = list(qs.order_by("created_at"))
        serialized = KanbanCandidateSerializer(all_candidates, many=True).data

        stages = {s: {"count": 0, "candidates": []} for s in ALL_STAGES}
        for item in serialized:
            s = item["stage"]
            if s in stages:
                stages[s]["candidates"].append(item)
                stages[s]["count"] += 1

        return Response({"stages": stages})
