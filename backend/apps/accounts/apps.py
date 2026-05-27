import os
import sys
from django.apps import AppConfig

# Commands that don't need external service validation on startup
_SKIP_CHECK_COMMANDS = {
    "migrate", "makemigrations", "test", "shell", "collectstatic",
    "check", "check_services", "dbshell", "showmigrations",
    "spectacular", "createsuperuser", "flush", "loaddata",
}


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"

    def ready(self):
        # Skip during management commands that don't benefit from the check
        cmd = sys.argv[1] if len(sys.argv) > 1 else ""
        if cmd in _SKIP_CHECK_COMMANDS:
            return

        # runserver starts a reloader process and a server process - only run in the server
        if cmd == "runserver" and os.environ.get("RUN_MAIN") != "true":
            return

        # Skip when running under pytest
        if "pytest" in sys.modules or "pytest" in sys.argv[0]:
            return

        from django.conf import settings
        if not getattr(settings, "STARTUP_CHECKS_ENABLED", True):
            return

        try:
            from django.core.management import call_command
            call_command("check_services")
        except Exception:
            pass  # Never block startup on a failed check
