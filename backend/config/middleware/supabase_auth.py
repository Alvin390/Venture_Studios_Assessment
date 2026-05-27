import base64
import jwt
import logging
from django.conf import settings
from django.utils.functional import SimpleLazyObject

logger = logging.getLogger(__name__)

EXEMPT_PATHS = {
    "/api/v1/auth/login/",
    "/admin/",
}

_supabase_admin_client = None


def _supabase_admin():
    global _supabase_admin_client
    if _supabase_admin_client is None:
        from supabase import create_client
        _supabase_admin_client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return _supabase_admin_client


def _hs256_key_candidates(secret: str):
    """
    Supabase shows the JWT secret base64-encoded in the dashboard.
    The actual signing key is the decoded bytes, so try that first.
    Also try the raw string for projects that use it directly.
    """
    try:
        padding = "=" * (-len(secret) % 4)
        yield base64.b64decode(secret + padding)
    except Exception:
        pass
    yield secret


def _verify_hs256(token: str, secret: str):
    for key in _hs256_key_candidates(secret):
        try:
            return jwt.decode(
                token, key, algorithms=["HS256"], audience="authenticated"
            )
        except jwt.ExpiredSignatureError:
            logger.warning("JWT validation failed: token expired")
            return None
        except (jwt.InvalidSignatureError, jwt.DecodeError):
            continue
        except jwt.InvalidTokenError as exc:
            logger.warning("JWT validation failed: %s", type(exc).__name__)
            return None
    logger.warning("JWT validation failed: invalid signature - check SUPABASE_JWT_SECRET")
    return None


def _verify_via_api(token: str):
    """Delegate token verification to Supabase Auth. Used as fallback for non-HS256 tokens."""
    try:
        resp = _supabase_admin().auth.get_user(token)
        user = resp.user
        return {"sub": str(user.id)} if user else None
    except Exception as exc:
        logger.warning("Supabase API token verification failed: %s", exc)
        return None


def _get_profile(request):
    from apps.accounts.models import Profile

    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]

    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError:
        logger.warning("JWT validation failed: malformed token")
        return None

    alg = header.get("alg", "")

    if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
        payload = _verify_hs256(token, settings.SUPABASE_JWT_SECRET)
    else:
        # RS256, HS512, missing alg, or no local secret - let Supabase verify it
        if alg != "HS256":
            logger.debug("JWT alg=%s, using Supabase Auth API for verification", alg)
        payload = _verify_via_api(token)

    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        return Profile.objects.select_related().get(id=user_id)
    except Profile.DoesNotExist:
        logger.warning("Valid JWT for user %s but no matching Profile found", user_id)
        return None
    except Exception:
        logger.exception("Unexpected error during profile lookup")
        return None


class SupabaseJWTMiddleware:
    """
    Attaches request.profile lazily - the DB hit only happens if
    a view actually accesses request.profile.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.profile = SimpleLazyObject(lambda: _get_profile(request))
        return self.get_response(request)
