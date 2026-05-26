from rest_framework.throttling import UserRateThrottle


class AIEvaluateThrottle(UserRateThrottle):
    scope = "ai_evaluate"

    def get_cache_key(self, request, view):
        # Our auth sets request.profile, not request.user, so UserRateThrottle's
        # default would fall back to IP-based limiting. Use the profile UUID instead.
        profile = getattr(request, "profile", None)
        ident = str(profile.id) if profile else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
