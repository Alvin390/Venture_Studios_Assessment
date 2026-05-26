from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q

from config.permissions import IsAuthenticated
from config.utils import get_effective_profile
from .models import Job
from .serializers import JobSerializer, JobWriteSerializer


def _annotated_job(pk):
    """Fetch a single job with candidate_count annotation."""
    return Job.objects.annotate(candidate_count=Count("candidates")).select_related("owner").get(pk=pk)


class JobListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _build_queryset(self, request):
        effective = get_effective_profile(request)
        qs = Job.objects.annotate(candidate_count=Count("candidates")).select_related("owner")

        # Admins see all jobs unless they are impersonating a specific user
        if not request.profile.is_admin or request.query_params.get("as_user"):
            qs = qs.filter(owner=effective)

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(department__icontains=search)
            )

        return qs.order_by("-created_at")

    def get(self, request):
        qs = self._build_queryset(request)
        serializer = JobSerializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    def post(self, request):
        effective = get_effective_profile(request)
        serializer = JobWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save(owner=effective)
        return Response(
            JobSerializer(_annotated_job(job.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class JobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_job(self, request, pk):
        try:
            job = _annotated_job(pk)
        except Job.DoesNotExist:
            return None
        if not request.profile.is_admin and job.owner_id != request.profile.id:
            return None
        return job

    def get(self, request, pk):
        job = self._get_job(request, pk)
        if not job:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(JobSerializer(job).data)

    def patch(self, request, pk):
        job = self._get_job(request, pk)
        if not job:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobWriteSerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(JobSerializer(_annotated_job(job.pk)).data)

    def delete(self, request, pk):
        job = self._get_job(request, pk)
        if not job:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
