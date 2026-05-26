"""
Tests for job endpoints: /api/v1/jobs/ and /api/v1/jobs/<pk>/
"""
import uuid

import pytest
from rest_framework import status

from apps.jobs.models import Job
from .conftest import set_auth


@pytest.mark.django_db
class TestJobList:
    URL = "/api/v1/jobs/"

    def test_customer_sees_only_own_jobs(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["title"] == job.title

    def test_idor_customer_cannot_see_other_jobs(self, api_client, customer_profile, other_customer):
        Job.objects.create(
            owner=other_customer,
            title="Other Job",
            department="HR",
            location="NYC",
            description=".",
            status="open",
        )
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.data["count"] == 0

    def test_admin_sees_all_jobs(self, api_client, admin_profile, customer_profile, job):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self.URL)
        assert resp.data["count"] >= 1

    def test_admin_as_user_scopes_to_customer(self, api_client, admin_profile, customer_profile, job):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self.URL + f"?as_user={customer_profile.id}")
        assert resp.data["count"] == 1

    def test_status_filter_open(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + "?status=open")
        assert resp.data["count"] == 1

    def test_status_filter_closed_returns_empty(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + "?status=closed")
        assert resp.data["count"] == 0

    def test_search_by_title(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + "?search=Software")
        assert resp.data["count"] == 1

    def test_search_no_match(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL + "?search=zzznomatch")
        assert resp.data["count"] == 0

    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestJobCreate:
    URL = "/api/v1/jobs/"

    def test_create_job_success(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {
                "title": "Backend Engineer",
                "department": "Engineering",
                "location": "Remote",
                "description": "Great opportunity",
                "status": "open",
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Backend Engineer"
        assert resp.data["candidate_count"] == 0

    def test_create_sets_owner_to_requester(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {"title": "New Role", "department": "Eng", "location": "Remote", "description": ".", "status": "open"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert str(resp.data["owner"]) == str(customer_profile.id)

    def test_blank_title_rejected(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {"title": "   ", "department": "Eng", "location": "Remote", "description": ".", "status": "open"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_status_rejected(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.post(
            self.URL,
            {"title": "Role", "department": "Eng", "location": "Remote", "description": ".", "status": "invalid"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestJobDetail:
    def _url(self, pk) -> str:
        return f"/api/v1/jobs/{pk}/"

    def test_get_own_job(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(job.pk))
        assert resp.status_code == status.HTTP_200_OK
        assert str(resp.data["id"]) == str(job.pk)

    def test_idor_customer_cannot_get_other_job(self, api_client, customer_profile, other_customer):
        other_job = Job.objects.create(
            owner=other_customer,
            title="Secret Job",
            department="X",
            location="Y",
            description=".",
            status="open",
        )
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(other_job.pk))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_get_nonexistent_returns_404(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(uuid.uuid4()))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_updates_title(self, api_client, customer_profile, job):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(job.pk), {"title": "Senior Engineer"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Senior Engineer"
        job.refresh_from_db()
        assert job.title == "Senior Engineer"

    def test_patch_is_partial(self, api_client, customer_profile, job):
        original_department = job.department
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(job.pk), {"title": "New Title"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["department"] == original_department

    def test_idor_customer_cannot_patch_other_job(self, api_client, customer_profile, other_customer):
        other_job = Job.objects.create(
            owner=other_customer, title="Other", department="X", location="Y", description=".", status="open"
        )
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self._url(other_job.pk), {"title": "Hacked"})
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_removes_job(self, api_client, customer_profile, job):
        pk = job.pk
        set_auth(api_client, customer_profile)
        resp = api_client.delete(self._url(pk))
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not Job.objects.filter(pk=pk).exists()

    def test_idor_customer_cannot_delete_other_job(self, api_client, customer_profile, other_customer):
        other_job = Job.objects.create(
            owner=other_customer, title="Other", department="X", location="Y", description=".", status="open"
        )
        set_auth(api_client, customer_profile)
        resp = api_client.delete(self._url(other_job.pk))
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        assert Job.objects.filter(pk=other_job.pk).exists()

    def test_admin_can_access_any_job(self, api_client, admin_profile, customer_profile, job):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self._url(job.pk))
        assert resp.status_code == status.HTTP_200_OK
