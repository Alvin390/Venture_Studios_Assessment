import time
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = "Validate connectivity and API keys for all external services."

    def handle(self, *args, **options):
        results = [
            self._check_database(),
            self._check_supabase_auth(),
            self._check_gemini(),
        ]
        self._print_table(results)

        failures = [r for r in results if not r["ok"]]
        if failures:
            names = ", ".join(r["service"] for r in failures)
            self.stderr.write(f"  Warning: {names} {'is' if len(failures) == 1 else 'are'} not reachable. Check your .env file.\n")

    # -- individual checks ---------------------------------------------------

    def _check_database(self):
        try:
            t = time.perf_counter()
            with connection.cursor() as cur:
                cur.execute("SELECT 1")
            ms = (time.perf_counter() - t) * 1000
            host = settings.DATABASES["default"].get("HOST", "localhost")
            return {"service": "PostgreSQL (Supabase)", "ok": True, "ms": ms, "detail": f"host={host}"}
        except Exception as exc:
            return {"service": "PostgreSQL (Supabase)", "ok": False, "ms": None, "detail": str(exc)[:80]}

    def _check_supabase_auth(self):
        url = f"{settings.SUPABASE_URL}/auth/v1/settings"
        headers = {"apikey": settings.SUPABASE_ANON_KEY, "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}"}
        try:
            t = time.perf_counter()
            resp = requests.get(url, headers=headers, timeout=10)
            ms = (time.perf_counter() - t) * 1000
            ok = resp.status_code == 200
            detail = "OK" if ok else f"HTTP {resp.status_code}"
            return {"service": "Supabase Auth API", "ok": ok, "ms": ms, "detail": detail}
        except Exception as exc:
            return {"service": "Supabase Auth API", "ok": False, "ms": None, "detail": str(exc)[:80]}

    def _check_gemini(self):
        key = settings.GEMINI_API_KEY
        if not key or "your-" in key:
            return {"service": "Gemini API", "ok": False, "ms": None, "detail": "API key not configured"}
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
        try:
            t = time.perf_counter()
            resp = requests.get(url, timeout=10)
            ms = (time.perf_counter() - t) * 1000
            ok = resp.status_code == 200
            if ok:
                model_count = len(resp.json().get("models", []))
                detail = f"{model_count} models available"
            else:
                detail = f"HTTP {resp.status_code}"
            return {"service": "Gemini API", "ok": ok, "ms": ms, "detail": detail}
        except Exception as exc:
            return {"service": "Gemini API", "ok": False, "ms": None, "detail": str(exc)[:80]}

    # -- display -------------------------------------------------------------

    def _print_table(self, results):
        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("  TalentFlow - Service Health Check"))
        self.stdout.write("  " + "-" * 56)
        for r in results:
            if r["ok"]:
                badge = self.style.SUCCESS("  OK  ")
            else:
                badge = self.style.ERROR(" FAIL ")
            ms = f"{r['ms']:6.0f} ms" if r["ms"] is not None else "    n/a"
            self.stdout.write(f"{badge}  {r['service']:<26}  {ms}  {r['detail']}")
        self.stdout.write("  " + "-" * 56)
        self.stdout.write("")
