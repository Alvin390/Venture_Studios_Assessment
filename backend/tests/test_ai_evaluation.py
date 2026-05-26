"""
Tests for the AI evaluation endpoint: /api/v1/candidates/<pk>/evaluate/

Offline: patches evaluate_candidate so no Gemini call is made.
Online:  runs against the real Gemini API when credentials are present.
"""
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status

from apps.candidates.models import Candidate, CandidateActivity
from apps.ai_evaluation.throttles import AIEvaluateThrottle
from .conftest import set_auth, online_only

_MOCK_RESULT = {
    "score": 82,
    "verdict": "strong_yes",
    "summary": "Excellent background with relevant experience.",
    "strengths": ["Python expertise", "5 years backend experience"],
    "gaps": ["No cloud certification"],
    "interview_questions": ["Walk me through a system you designed end-to-end."],
}


@pytest.mark.django_db
class TestAIEvaluateView:
    def _url(self, pk) -> str:
        return f"/api/v1/candidates/{pk}/evaluate/"

    def test_offline_returns_200_and_correct_shape(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        with patch("apps.ai_evaluation.views.evaluate_candidate", return_value=_MOCK_RESULT):
            resp = api_client.post(self._url(candidate.pk))

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["score"] == 82
        assert resp.data["verdict"] == "strong_yes"
        assert isinstance(resp.data["strengths"], list)
        assert isinstance(resp.data["gaps"], list)
        assert isinstance(resp.data["interview_questions"], list)
        assert "evaluated_at" in resp.data

    def test_results_persisted_on_candidate(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        with patch("apps.ai_evaluation.views.evaluate_candidate", return_value=_MOCK_RESULT):
            api_client.post(self._url(candidate.pk))

        candidate.refresh_from_db()
        assert candidate.ai_score == 82
        assert candidate.ai_verdict == "strong_yes"
        assert candidate.ai_strengths == _MOCK_RESULT["strengths"]
        assert candidate.ai_gaps == _MOCK_RESULT["gaps"]
        assert candidate.ai_interview_questions == _MOCK_RESULT["interview_questions"]
        assert candidate.ai_evaluated_at is not None

    def test_logs_ai_evaluated_activity(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        with patch("apps.ai_evaluation.views.evaluate_candidate", return_value=_MOCK_RESULT):
            api_client.post(self._url(candidate.pk))

        activity = CandidateActivity.objects.filter(
            candidate=candidate,
            action=CandidateActivity.ACTION_AI_EVALUATED,
        ).first()
        assert activity is not None
        assert activity.metadata["score"] == 82
        assert activity.metadata["verdict"] == "strong_yes"

    def test_gemini_error_returns_503(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        with patch("apps.ai_evaluation.views.evaluate_candidate", side_effect=Exception("API down")):
            resp = api_client.post(self._url(candidate.pk))
        assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_idor_blocked_returns_404(self, api_client, customer_profile, other_customer):
        other = Candidate.objects.create(
            owner=other_customer,
            full_name="Other",
            email="o@o.com",
            stage=Candidate.STAGE_APPLIED,
        )
        set_auth(api_client, customer_profile)
        with patch("apps.ai_evaluation.views.evaluate_candidate", return_value=_MOCK_RESULT):
            resp = api_client.post(self._url(other.pk))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_returns_403(self, api_client, candidate):
        resp = api_client.post(self._url(candidate.pk))
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_nonexistent_candidate_returns_404(self, api_client, customer_profile):
        import uuid
        set_auth(api_client, customer_profile)
        with patch("apps.ai_evaluation.views.evaluate_candidate", return_value=_MOCK_RESULT):
            resp = api_client.post(self._url(uuid.uuid4()))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    @online_only
    def test_real_gemini_returns_valid_response(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.post(self._url(candidate.pk))
        assert resp.status_code == status.HTTP_200_OK
        assert 0 <= resp.data["score"] <= 100
        assert resp.data["verdict"] in ("strong_yes", "yes", "maybe", "no")
        assert isinstance(resp.data["strengths"], list)
        assert isinstance(resp.data["gaps"], list)
        assert len(resp.data["interview_questions"]) > 0


@pytest.mark.django_db
class TestAIEvaluateThrottle:
    def test_cache_key_uses_profile_id(self, customer_profile):
        throttle = AIEvaluateThrottle()

        mock_request = MagicMock()
        mock_request.profile = customer_profile

        key = throttle.get_cache_key(mock_request, None)
        assert str(customer_profile.id) in key
        assert throttle.scope in key

    def test_cache_key_falls_back_to_ip_without_profile(self):
        throttle = AIEvaluateThrottle()

        mock_request = MagicMock()
        mock_request.profile = None
        mock_request.META = {"REMOTE_ADDR": "10.0.0.1"}

        # Should not raise and should return something IP-based
        key = throttle.get_cache_key(mock_request, None)
        assert key is not None
