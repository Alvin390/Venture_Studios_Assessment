from .development import *  # noqa: F401, F403

# Fast in-memory SQLite - no real Supabase DB needed for tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Prevent AppConfig.ready() from running check_services during test collection
STARTUP_CHECKS_ENABLED = False

# Disable all rate limiting so tests are never throttled
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []
# Keep ai_evaluate rate so AIEvaluateThrottle (view-level) can initialize,
# but the class itself is effectively dead since DEFAULT_THROTTLE_CLASSES is empty.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"ai_evaluate": "9999/day"}

# Fixed secret so test JWTs are reproducible
SUPABASE_JWT_SECRET = "test-jwt-secret-for-unit-tests-minimum-32-chars"
