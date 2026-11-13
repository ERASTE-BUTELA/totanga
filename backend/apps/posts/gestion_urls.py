from django.urls import path

from .gestion_views import PublicationDetailView, PublicationListView

urlpatterns = [
    path("publications/", PublicationListView.as_view(), name="staff-publications"),
    path("publications/<int:pk>/", PublicationDetailView.as_view(), name="staff-publication"),
]
