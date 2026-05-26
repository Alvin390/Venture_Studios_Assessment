from rest_framework.throttling import UserRateThrottle


class AIEvaluateThrottle(UserRateThrottle):
    scope = "ai_evaluate"
