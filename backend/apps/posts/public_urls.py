from django.urls import path

from .public_views import PublicPublicationDetailView, PublicPublicationListView

urlpatterns = [
    path("", PublicPublicationListView.as_view(), name="public-publications"),
    path("<slug:slug>/", PublicPublicationDetailView.as_view(), name="public-publication"),
]
