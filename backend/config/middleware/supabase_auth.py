import jwt
import logging
from django.conf import settings
from django.utils.functional import SimpleLazyObject

logger = logging.getLogger(__name__)

# Paths that don't need authentication
EXEMPT_PATHS = {
    "/api/v1/auth/login/",
    "/admin/",
}


def _get_profile(request):
    """
    Validates the Bearer token from the Authorization header.
    Returns the matching Profile or None if the token is absent/invalid.
    """
    from apps.accounts.models import Profile

    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]

    if not settings.SUPABASE_JWT_SECRET:
        logger.warning("SUPABASE_JWT_SECRET is not configured - JWT validation skipped")
        return None

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            return None

        return Profile.objects.select_related().get(id=user_id)

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Profile.DoesNotExist:
        # Valid token but profile not synced yet
        logger.warning("Valid JWT for user %s but no matching Profile found", payload.get("sub"))
        return None
    except Exception:
        logger.exception("Unexpected error during JWT validation")
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
