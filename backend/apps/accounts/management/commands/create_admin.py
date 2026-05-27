from django.core.management.base import BaseCommand, CommandError
from django.conf import settings


class Command(BaseCommand):
    help = "Bootstrap the first admin account without needing the Supabase Auth UI."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str, help="Admin email address")
        parser.add_argument("password", type=str, help="Admin password")
        parser.add_argument("--full-name", dest="full_name", default="", help="Display name (defaults to email prefix)")

    def handle(self, *args, **options):
        from supabase import create_client
        from apps.accounts.models import Profile

        email = options["email"]
        password = options["password"]
        full_name = options["full_name"] or email.split("@")[0]

        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        self.stdout.write(f"Creating Supabase auth user for {email} ...")
        try:
            response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name, "role": "admin"},
            })
        except Exception as exc:
            raise CommandError(f"Supabase auth error: {exc}")

        user = response.user
        if not user:
            raise CommandError("Supabase returned no user object.")

        self.stdout.write("Creating profile row ...")
        Profile.objects.update_or_create(
            id=user.id,
            defaults={
                "email": email,
                "full_name": full_name,
                "role": Profile.ROLE_ADMIN,
                "company": "",
                "is_active": True,
            },
        )

        self.stdout.write(self.style.SUCCESS(f"Admin ready: {email}"))
