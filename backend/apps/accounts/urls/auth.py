from django.urls import path
from apps.accounts.views import MeView, DashboardStatsView

urlpatterns = [
    path("me/",    MeView.as_view(),             name="auth-me"),
    path("stats/", DashboardStatsView.as_view(), name="auth-stats"),
]
