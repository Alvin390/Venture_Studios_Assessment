import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from supabase import create_client
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample

from config.permissions import IsAuthenticated, IsAdmin
from .models import Profile
from .serializers import ProfileSerializer, ProfileUpdateSerializer, AccountCreateSerializer

logger = logging.getLogger(__name__)


def get_supabase_admin():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get current user profile",
        description="Returns the profile of the authenticated user.",
        tags=["Auth"],
        responses={200: ProfileSerializer},
    )
    def get(self, request):
        return Response(ProfileSerializer(request.profile).data)

    @extend_schema(
        summary="Update current user profile",
        description="Update `full_name` and/or `company` for the authenticated user.",
        tags=["Auth"],
        request=ProfileUpdateSerializer,
        responses={200: ProfileSerializer},
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(request.profile).data)


class AccountListCreateView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        summary="List all accounts",
        description="Admin only. Returns every profile in the system.",
        tags=["Admin - Accounts"],
        responses={200: ProfileSerializer(many=True)},
    )
    def get(self, request):
        profiles = Profile.objects.all().order_by("-created_at")
        return Response(ProfileSerializer(profiles, many=True).data)

    @extend_schema(
        summary="Create a new account",
        description=(
            "Admin only. Creates a Supabase Auth user and a matching Profile row. "
            "The email is confirmed automatically."
        ),
        tags=["Admin - Accounts"],
        request=AccountCreateSerializer,
        responses={201: ProfileSerializer},
    )
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
    permission_classes = [IsAdmin]

    def _get_profile(self, pk):
        try:
            return Profile.objects.get(id=pk)
        except Profile.DoesNotExist:
            return None

    @extend_schema(
        summary="Get account by ID",
        description="Admin only. Returns a specific user profile.",
        tags=["Admin - Accounts"],
        responses={200: ProfileSerializer, 404: None},
    )
    def get(self, request, pk):
        profile = self._get_profile(pk)
        if not profile:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProfileSerializer(profile).data)

    @extend_schema(
        summary="Update account",
        description="Admin only. Update full_name or company for any user.",
        tags=["Admin - Accounts"],
        request=ProfileUpdateSerializer,
        responses={200: ProfileSerializer, 404: None},
    )
    def patch(self, request, pk):
        profile = self._get_profile(pk)
        if not profile:
            return Response({"error": "Account not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(profile).data)

    @extend_schema(
        summary="Deactivate account",
        description="Admin only. Soft-deletes the account by setting `is_active = false`. Cannot deactivate your own account.",
        tags=["Admin - Accounts"],
        responses={204: None, 400: None, 404: None},
    )
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
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get dashboard stats",
        description=(
            "Returns aggregated counts for the dashboard. "
            "Admins get global totals; customers get only their own data. "
            "Use `?as_user=<id>` (admin only) to get stats for a specific customer."
        ),
        tags=["Auth"],
        parameters=[
            OpenApiParameter(
                "as_user",
                OpenApiTypes.UUID,
                description="Admin only: return stats scoped to this customer profile.",
                required=False,
            )
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "total_jobs": {"type": "integer"},
                    "open_jobs": {"type": "integer"},
                    "total_candidates": {"type": "integer"},
                    "hired_count": {"type": "integer"},
                    "in_interview": {"type": "integer"},
                    "in_offer": {"type": "integer"},
                    "recent_candidates": {"type": "array", "items": {}},
                },
            }
        },
    )
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
