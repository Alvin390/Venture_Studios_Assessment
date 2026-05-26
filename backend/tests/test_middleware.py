"""
Tests for the SupabaseJWT middleware's _get_profile helper.

These run fully offline - they only touch the in-memory SQLite test DB.
"""
import time
import uuid

import jwt
import pytest
from django.test import RequestFactory

from config.middleware.supabase_auth import _get_profile
from .conftest import make_jwt, _TEST_SECRET


def _req(token: str | None = None):
    rf = RequestFactory()
    req = rf.get("/")
    if token:
        req.META["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return req


@pytest.mark.django_db
class TestGetProfile:
    def test_valid_token_returns_profile(self, admin_profile):
        token = make_jwt(admin_profile)
        profile = _get_profile(_req(token))
        assert profile is not None
        assert profile.id == admin_profile.id

    def test_expired_token_returns_none(self, admin_profile):
        token = make_jwt(admin_profile, expired=True)
        assert _get_profile(_req(token)) is None

    def test_invalid_signature_returns_none(self):
        assert _get_profile(_req("not.a.valid.jwt")) is None

    def test_missing_header_returns_none(self):
        assert _get_profile(_req()) is None

    def test_wrong_audience_returns_none(self, admin_profile):
        payload = {
            "sub": str(admin_profile.id),
            "aud": "wrong_audience",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        }
        token = jwt.encode(payload, _TEST_SECRET, algorithm="HS256")
        assert _get_profile(_req(token)) is None

    def test_unknown_sub_returns_none(self):
        # Token is valid but no Profile row exists for this UUID
        fake_id = uuid.uuid4()
        payload = {
            "sub": str(fake_id),
            "aud": "authenticated",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        }
        token = jwt.encode(payload, _TEST_SECRET, algorithm="HS256")
        assert _get_profile(_req(token)) is None

    def test_empty_jwt_secret_returns_none(self, admin_profile, settings):
        settings.SUPABASE_JWT_SECRET = ""
        token = make_jwt(admin_profile)
        assert _get_profile(_req(token)) is None

    def test_bearer_prefix_required(self, admin_profile):
        token = make_jwt(admin_profile)
        rf = RequestFactory()
        req = rf.get("/")
        req.META["HTTP_AUTHORIZATION"] = f"Token {token}"  # wrong scheme
        assert _get_profile(req) is None
