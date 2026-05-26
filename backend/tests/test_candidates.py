"""
Tests for candidate endpoints: /api/v1/candidates/ and stage/kanban sub-routes.
"""
import uuid

import pytest
from rest_framework import status

from apps.candidates.models import Candidate, CandidateActivity
from apps.jobs.models import Job
from .conftest import set_auth


@pytest.mark.django_db
class TestCandidateList:
    URL = "/api/v1/candidates/"

    def test_customer_sees_own_candidates(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_idor_customer_cannot_see_others(self, api_client, customer_profile, other_customer):
        Candidate.objects.create(
            owner=other_customer,
            full_name="Other Person",
            email="other@x.com",
            stage=Candidate.STAGE_APPLIED,
        )
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.data["count"] == 0

    def test_filter_by_stage(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        assert api_client.get(self.URL + "?stage=applied").data["count"] == 1
        assert api_client.get(self.URL + "?stage=hired").data["count"] == 0

    def test_filter_by_job_id(self, api_client, customer_profile, candidate, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + f"?job_id={job.pk}")
        assert resp.data["count"] == 1

    def test_search_by_name(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        assert api_client.get(self.URL + "?search=Jane").data["count"] == 1
        assert api_client.get(self.URL + "?search=zzznomatch").data["count"] == 0

    def test_search_by_email(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + "?search=jane@example")
        assert resp.data["count"] == 1

    def test_admin_sees_all_candidates(self, api_client, admin_profile, candidate):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self.URL)
        assert resp.data["count"] >= 1

    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCandidateCreate:
    URL = "/api/v1/candidates/"

    def test_create_logs_created_activity(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {
                "full_name": "New Candidate",
                "email": "new@candidate.com",
                "job": str(job.pk),
                "stage": "applied",
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert CandidateActivity.objects.filter(
            candidate_id=resp.data["id"],
            action=CandidateActivity.ACTION_CREATED,
        ).exists()

    def test_email_normalized_to_lowercase(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {"full_name": "Test", "email": "UPPER@TEST.COM", "stage": "applied"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["email"] == "upper@test.com"

    def test_blank_name_rejected(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(self.URL, {"full_name": "  ", "email": "x@x.com"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_linkedin_url_rejected(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {
                "full_name": "Test",
                "email": "t@t.com",
                "linkedin_url": "https://twitter.com/testuser",
                "stage": "applied",
            },
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_valid_linkedin_url_accepted(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {
                "full_name": "Test",
                "email": "t@t.com",
                "linkedin_url": "https://linkedin.com/in/testuser",
                "stage": "applied",
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_sets_owner_to_requester(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {"full_name": "Test", "email": "t@t.com", "stage": "applied"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert str(resp.data["owner"]) == str(customer_profile.id)


@pytest.mark.django_db
class TestCandidateDetail:
    def _url(self, pk) -> str:
        return f"/api/v1/candidates/{pk}/"

    def test_get_own_candidate(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(candidate.pk))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["full_name"] == candidate.full_name
        assert "activities" in resp.data

    def test_idor_returns_404(self, api_client, customer_profile, other_customer):
        other = Candidate.objects.create(
            owner=other_customer,
            full_name="Other",
            email="o@o.com",
            stage=Candidate.STAGE_APPLIED,
        )
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(other.pk))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_nonexistent_returns_404(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(uuid.uuid4()))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_notes_logs_activity(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(candidate.pk), {"notes": "Strong candidate"})
        assert resp.status_code == status.HTTP_200_OK
        assert CandidateActivity.objects.filter(
            candidate=candidate,
            action=CandidateActivity.ACTION_NOTE_ADDED,
        ).exists()

    def test_patch_same_notes_no_activity(self, api_client, customer_profile, candidate):
        candidate.notes = "existing notes"
        candidate.save(update_fields=["notes"])
        set_auth(api_client, customer_profile)
        api_client.patch(self._url(candidate.pk), {"notes": "existing notes"})
        assert not CandidateActivity.objects.filter(
            candidate=candidate,
            action=CandidateActivity.ACTION_NOTE_ADDED,
        ).exists()

    def test_delete_removes_candidate(self, api_client, customer_profile, candidate):
        pk = candidate.pk
        set_auth(api_client, customer_profile)
        resp = api_client.delete(self._url(pk))
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not Candidate.objects.filter(pk=pk).exists()

    def test_idor_delete_blocked(self, api_client, customer_profile, other_customer):
        other = Candidate.objects.create(
            owner=other_customer,
            full_name="Other",
            email="o@o.com",
            stage=Candidate.STAGE_APPLIED,
        )
        set_auth(api_client, customer_profile)
        resp = api_client.delete(self._url(other.pk))
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        assert Candidate.objects.filter(pk=other.pk).exists()

    def test_admin_can_read_any_candidate(self, api_client, admin_profile, candidate):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self._url(candidate.pk))
        assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestStageMove:
    def _url(self, pk) -> str:
        return f"/api/v1/candidates/{pk}/stage/"

    def test_valid_stage_change_succeeds(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(candidate.pk), {"stage": "screening"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["stage"] == "screening"

    def test_stage_change_logs_activity(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        api_client.patch(self._url(candidate.pk), {"stage": "screening"})
        activity = CandidateActivity.objects.filter(
            candidate=candidate,
            action=CandidateActivity.ACTION_STAGE_CHANGE,
        ).first()
        assert activity is not None
        assert activity.metadata["from"] == Candidate.STAGE_APPLIED
        assert activity.metadata["to"] == "screening"

    def test_same_stage_is_noop(self, api_client, customer_profile, candidate):
        original_stage = candidate.stage
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(candidate.pk), {"stage": original_stage})
        assert resp.status_code == status.HTTP_200_OK
        assert not CandidateActivity.objects.filter(
            candidate=candidate,
            action=CandidateActivity.ACTION_STAGE_CHANGE,
        ).exists()

    def test_invalid_stage_rejected(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(candidate.pk), {"stage": "promoted"})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_idor_blocked(self, api_client, customer_profile, other_customer):
        other = Candidate.objects.create(
            owner=other_customer,
            full_name="Other",
            email="o@o.com",
            stage=Candidate.STAGE_APPLIED,
        )
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(other.pk), {"stage": "screening"})
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestKanbanView:
    URL = "/api/v1/candidates/kanban/"

    def test_all_stages_present(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_200_OK
        stages = resp.data["stages"]
        for stage in ("applied", "screening", "interview", "technical", "offer", "hired", "rejected"):
            assert stage in stages

    def test_candidate_appears_in_correct_column(self, api_client, customer_profile, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        applied = resp.data["stages"]["applied"]
        assert applied["count"] == 1
        assert applied["candidates"][0]["full_name"] == candidate.full_name

    def test_job_id_filter(self, api_client, customer_profile, candidate, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + f"?job_id={job.pk}")
        assert resp.data["stages"]["applied"]["count"] == 1
        # Use a different job ID -> empty
        other_job = Job.objects.create(
            owner=customer_profile, title="Other", department="X",
            location="Y", description=".", status="open"
        )
        resp2 = api_client.get(self.URL + f"?job_id={other_job.pk}")
        assert resp2.data["stages"]["applied"]["count"] == 0

    def test_customer_isolated_from_others(self, api_client, customer_profile, other_customer):
        Candidate.objects.create(
            owner=other_customer,
            full_name="Hidden",
            email="hidden@x.com",
            stage=Candidate.STAGE_APPLIED,
        )
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        total = sum(s["count"] for s in resp.data["stages"].values())
        assert total == 0  # customer_profile has no candidates here

    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
