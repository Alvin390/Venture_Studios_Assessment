from django.urls import path, include

urlpatterns = [
    path("auth/", include("apps.accounts.urls.auth")),
    path("admin/accounts/", include("apps.accounts.urls.admin")),
    path("jobs/", include("apps.jobs.urls")),
    path("candidates/", include("apps.candidates.urls")),
    path("ai/", include("apps.ai_evaluation.urls")),
]
