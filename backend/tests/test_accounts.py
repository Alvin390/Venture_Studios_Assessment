"""
Tests for accounts endpoints: /api/v1/auth/me/, /api/v1/auth/stats/,
/api/v1/admin/accounts/
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status

from apps.accounts.models import Profile
from apps.jobs.models import Job
from apps.candidates.models import Candidate
from .conftest import set_auth, online_only


@pytest.mark.django_db
class TestMeView:
    URL = "/api/v1/auth/me/"

    def test_get_own_profile(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == customer_profile.email
        assert resp.data["full_name"] == customer_profile.full_name

    def test_patch_full_name(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self.URL, {"full_name": "Updated Name"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["full_name"] == "Updated Name"
        customer_profile.refresh_from_db()
        assert customer_profile.full_name == "Updated Name"

    def test_patch_company(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self.URL, {"company": "Acme Corp"})
        assert resp.status_code == status.HTTP_200_OK
        customer_profile.refresh_from_db()
        assert customer_profile.company == "Acme Corp"

    def test_blank_full_name_rejected(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.patch(self.URL, {"full_name": "   "})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDashboardStats:
    URL = "/api/v1/auth/stats/"

    def test_returns_expected_keys(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_200_OK
        for key in ("total_jobs", "open_jobs", "total_candidates", "hired_count", "recent_candidates"):
            assert key in resp.data

    def test_customer_counts_own_data(self, api_client, customer_profile, job, candidate):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.data["total_jobs"] == 1
        assert resp.data["total_candidates"] == 1

    def test_customer_excludes_other_data(self, api_client, customer_profile, other_customer, job):
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
        assert resp.data["total_jobs"] == 1  # only customer_profile's job

    def test_admin_sees_global_totals(self, api_client, admin_profile, customer_profile, job, candidate):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self.URL)
        assert resp.data["total_jobs"] >= 1
        assert resp.data["total_candidates"] >= 1

    def test_unauthenticated_returns_403(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAccountListCreate:
    URL = "/api/v1/admin/accounts/"

    def test_admin_can_list_all_profiles(self, api_client, admin_profile, customer_profile):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_200_OK
        assert isinstance(resp.data, list)
        ids = [str(p["id"]) for p in resp.data]
        assert str(customer_profile.id) in ids

    def test_customer_is_forbidden(self, api_client, customer_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_is_forbidden(self, api_client):
        resp = api_client.get(self.URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_create_offline_mock(self, api_client, admin_profile):
        fake_user = MagicMock()
        fake_user.id = uuid.uuid4()

        fake_response = MagicMock()
        fake_response.user = fake_user

        mock_admin_client = MagicMock()
        mock_admin_client.auth.admin.create_user.return_value = fake_response

        set_auth(api_client, admin_profile)
        with patch("apps.accounts.views.get_supabase_admin", return_value=mock_admin_client):
            resp = api_client.post(
                self.URL,
                {
                    "email": "newuser@test.com",
                    "password": "SecurePass123!",
                    "full_name": "New User",
                    "role": Profile.ROLE_CUSTOMER,
                },
            )

        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["email"] == "newuser@test.com"

    @online_only
    def test_admin_create_real_supabase(self, api_client, admin_profile):
        set_auth(api_client, admin_profile)
        unique_email = f"test_{uuid.uuid4().hex[:8]}@talentflow.test"
        resp = api_client.post(
            self.URL,
            {
                "email": unique_email,
                "password": "SecurePass123!",
                "full_name": "Integration Test User",
                "role": Profile.ROLE_CUSTOMER,
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["email"] == unique_email


@pytest.mark.django_db
class TestAccountDetail:
    def _url(self, pk) -> str:
        return f"/api/v1/admin/accounts/{pk}/"

    def test_admin_get_profile(self, api_client, admin_profile, customer_profile):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self._url(customer_profile.id))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == customer_profile.email

    def test_admin_get_nonexistent_returns_404(self, api_client, admin_profile):
        set_auth(api_client, admin_profile)
        resp = api_client.get(self._url(uuid.uuid4()))
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_patch_profile(self, api_client, admin_profile, customer_profile):
        set_auth(api_client, admin_profile)
        resp = api_client.patch(self._url(customer_profile.id), {"company": "New Corp"})
        assert resp.status_code == status.HTTP_200_OK
        customer_profile.refresh_from_db()
        assert customer_profile.company == "New Corp"

    def test_admin_cannot_deactivate_self(self, api_client, admin_profile):
        set_auth(api_client, admin_profile)
        resp = api_client.delete(self._url(admin_profile.id))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_deactivates_other_user(self, api_client, admin_profile, customer_profile):
        set_auth(api_client, admin_profile)
        resp = api_client.delete(self._url(customer_profile.id))
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        customer_profile.refresh_from_db()
        assert customer_profile.is_active is False

    def test_customer_cannot_access_admin_endpoints(self, api_client, customer_profile, admin_profile):
        set_auth(api_client, customer_profile)
        resp = api_client.get(self._url(admin_profile.id))
        assert resp.status_code == status.HTTP_403_FORBIDDEN
