from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from config.permissions import IsAuthenticated
from config.utils import get_effective_profile
from apps.candidates.models import Candidate, CandidateActivity
from .services import evaluate_candidate
from .throttles import AIEvaluateThrottle


class CandidateEvaluateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AIEvaluateThrottle]

    def post(self, request, pk):
        profile = get_effective_profile(request)

        try:
            qs = Candidate.objects.select_related("job")
            if not profile.is_admin:
                qs = qs.filter(owner=profile)
            candidate = qs.get(pk=pk)
        except Candidate.DoesNotExist:
            return Response({"error": "Not found.", "code": "not_found"}, status=404)

        try:
            result = evaluate_candidate(candidate, candidate.job)
        except Exception:
            return Response(
                {"error": "AI evaluation failed. Please try again later.", "code": "ai_error"},
                status=503,
            )

        candidate.ai_score = result["score"]
        candidate.ai_summary = result["summary"]
        candidate.ai_verdict = result["verdict"]
        candidate.ai_strengths = result.get("strengths", [])
        candidate.ai_gaps = result.get("gaps", [])
        candidate.ai_interview_questions = result.get("interview_questions", [])
        candidate.ai_evaluated_at = timezone.now()
        candidate.save(
            update_fields=[
                "ai_score",
                "ai_summary",
                "ai_verdict",
                "ai_strengths",
                "ai_gaps",
                "ai_interview_questions",
                "ai_evaluated_at",
                "updated_at",
            ]
        )

        CandidateActivity.objects.create(
            candidate=candidate,
            actor=request.profile,
            action=CandidateActivity.ACTION_AI_EVALUATED,
            metadata={"score": result["score"], "verdict": result["verdict"]},
        )

        return Response(
            {
                "score": result["score"],
                "verdict": result["verdict"],
                "summary": result["summary"],
                "strengths": result["strengths"],
                "gaps": result["gaps"],
                "interview_questions": result["interview_questions"],
                "evaluated_at": candidate.ai_evaluated_at.isoformat(),
            }
        )
