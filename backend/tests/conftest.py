"""
Shared fixtures and helpers for the TalentFlow test suite.

Online/offline detection: tests marked with `online_only` are skipped
automatically when the machine has no network or when .env credentials
still contain placeholder values.
"""
import uuid
import socket
import time

import jwt
import pytest
from rest_framework.test import APIClient

from django.conf import settings

from apps.accounts.models import Profile
from apps.jobs.models import Job
from apps.candidates.models import Candidate

# ---------------------------------------------------------------------------
# Online/offline detection
# ---------------------------------------------------------------------------

def _can_reach_internet() -> bool:
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False


def _credentials_are_real() -> bool:
    placeholders = ("your-", "placeholder", "example.com", "xxx", "changeme", "change-this")
    checks = [
        getattr(settings, "SUPABASE_URL", ""),
        getattr(settings, "SUPABASE_ANON_KEY", ""),
        getattr(settings, "GEMINI_API_KEY", ""),
    ]
    for val in checks:
        if not val or any(p in val.lower() for p in placeholders):
            return False
    return True


ONLINE = _can_reach_internet() and _credentials_are_real()

online_only = pytest.mark.skipif(
    not ONLINE,
    reason="Requires network access and real API credentials in .env",
)

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

_TEST_SECRET = "test-jwt-secret-for-unit-tests-minimum-32-chars"


def make_jwt(profile: Profile, *, expired: bool = False) -> str:
    now = int(time.time())
    payload = {
        "sub": str(profile.id),
        "aud": "authenticated",
        "iat": now,
        "exp": now + (-10 if expired else 3600),
        "email": profile.email,
        "role": "authenticated",
    }
    return jwt.encode(payload, _TEST_SECRET, algorithm="HS256")


def set_auth(client: APIClient, profile: Profile) -> APIClient:
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_jwt(profile)}")
    return client


# ---------------------------------------------------------------------------
# Core fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def admin_profile(db) -> Profile:
    return Profile.objects.create(
        id=uuid.uuid4(),
        full_name="Admin User",
        email="admin@talentflow.test",
        role=Profile.ROLE_ADMIN,
    )


@pytest.fixture
def customer_profile(db) -> Profile:
    return Profile.objects.create(
        id=uuid.uuid4(),
        full_name="Customer User",
        email="customer@talentflow.test",
        role=Profile.ROLE_CUSTOMER,
    )


@pytest.fixture
def other_customer(db) -> Profile:
    return Profile.objects.create(
        id=uuid.uuid4(),
        full_name="Other Customer",
        email="other@talentflow.test",
        role=Profile.ROLE_CUSTOMER,
    )


@pytest.fixture
def job(db, customer_profile) -> Job:
    return Job.objects.create(
        owner=customer_profile,
        title="Software Engineer",
        department="Engineering",
        location="Remote",
        description="Build great things.",
        status=Job.STATUS_OPEN,
    )


@pytest.fixture
def candidate(db, customer_profile, job) -> Candidate:
    return Candidate.objects.create(
        owner=customer_profile,
        job=job,
        full_name="Jane Smith",
        email="jane@example.com",
        stage=Candidate.STAGE_APPLIED,
    )
