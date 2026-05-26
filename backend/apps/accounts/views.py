import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client

from config.permissions import IsAuthenticated, IsAdmin
from .models import Profile
from .serializers import ProfileSerializer, ProfileUpdateSerializer, AccountCreateSerializer

logger = logging.getLogger(__name__)


def get_supabase_admin():
    """Returns a Supabase client with service role key for admin operations."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class MeView(APIView):
    """Returns the authenticated user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ProfileSerializer(request.profile).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(request.profile).data)


class AccountListCreateView(APIView):
    """Admin: list all accounts or create a new one."""
    permission_classes = [IsAdmin]

    def get(self, request):
        profiles = Profile.objects.all().order_by("-created_at")
        return Response(ProfileSerializer(profiles, many=True).data)

    def post(self, request):
        serializer = AccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        supabase_admin = get_supabase_admin()

        try:
            response = supabase_admin.auth.admin.create_user(
                {
                    "email": data["email"],
                    "password": data["password"],
                    "user_metadata": {
                        "full_name": data["full_name"],
                        "role": data["role"],
                    },
                    "email_confirm": True,
                }
            )
        except Exception as exc:
            logger.error("Failed to create Supabase user: %s", exc)
            return Response(
                {"error": "Failed to create account. The email may already be in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        supabase_user = response.user
        if not supabase_user:
            return Response(
                {"error": "Failed to create account."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Upsert profile - the Supabase trigger may have already created it
        profile, _ = Profile.objects.update_or_create(
            id=supabase_user.id,
            defaults={
                "email": data["email"],
                "full_name": data["full_name"],
                "role": data["role"],
                "company": data.get("company", ""),
                "is_active": True,
            },
        )

        return Response(ProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class AccountDetailView(APIView):
    """Admin: retrieve, update, or deactivate a specific account."""
    permission_classes = [IsAdmin]

    def _get_profile(self, pk):
        try:
            return Profile.objects.get(id=pk)
        except Profile.DoesNotExist:
            return None

    def get(self, request, pk):
        profile = self._get_profile(pk)
        if not profile:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request, pk):
        profile = self._get_profile(pk)
        if not profile:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(profile).data)

    def delete(self, request, pk):
        profile = self._get_profile(pk)
        if not profile:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
        if profile.id == request.profile.id:
            return Response(
                {"error": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.is_active = False
        profile.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class DashboardStatsView(APIView):
    """
    Returns aggregated counts for the dashboard.
    Admins get global counts; customers get their own counts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Q
        from apps.jobs.models import Job
        from apps.candidates.models import Candidate
        from config.utils import get_effective_profile

        effective = get_effective_profile(request)

        job_filter = {} if request.profile.is_admin and not request.query_params.get("as_user") else {"owner": effective}
        candidate_filter = {} if request.profile.is_admin and not request.query_params.get("as_user") else {"owner": effective}

        job_stats = Job.objects.filter(**job_filter).aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status="open")),
        )

        candidate_stats = Candidate.objects.filter(**candidate_filter).aggregate(
            total=Count("id"),
            hired=Count("id", filter=Q(stage="hired")),
            in_interview=Count("id", filter=Q(stage="interview")),
            in_offer=Count("id", filter=Q(stage="offer")),
        )

        # Recent candidates (last 8)
        from apps.candidates.serializers import CandidateListSerializer
        recent_qs = (
            Candidate.objects.filter(**candidate_filter)
            .select_related("job", "owner")
            .order_by("-created_at")[:8]
        )

        return Response(
            {
                "total_jobs": job_stats["total"] or 0,
                "open_jobs": job_stats["open"] or 0,
                "total_candidates": candidate_stats["total"] or 0,
                "hired_count": candidate_stats["hired"] or 0,
                "in_interview": candidate_stats["in_interview"] or 0,
                "in_offer": candidate_stats["in_offer"] or 0,
                "recent_candidates": CandidateListSerializer(recent_qs, many=True).data,
            }
        )
