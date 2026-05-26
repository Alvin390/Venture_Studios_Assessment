from django.urls import path
from apps.accounts.views import AccountListCreateView, AccountDetailView

urlpatterns = [
    path("",        AccountListCreateView.as_view(), name="admin-accounts-list"),
    path("<uuid:pk>/", AccountDetailView.as_view(),  name="admin-accounts-detail"),
]
