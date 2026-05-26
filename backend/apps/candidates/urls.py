from django.urls import path
from .views import (
    CandidateListCreateView,
    CandidateDetailView,
    CandidateStageMoveView,
    KanbanView,
)

urlpatterns = [
    path("",                       CandidateListCreateView.as_view(), name="candidate-list"),
    path("kanban/",                KanbanView.as_view(),              name="candidate-kanban"),
    path("<uuid:pk>/",             CandidateDetailView.as_view(),     name="candidate-detail"),
    path("<uuid:pk>/stage/",       CandidateStageMoveView.as_view(),  name="candidate-stage"),
]
