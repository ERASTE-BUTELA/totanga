from django.urls import path

from .public_views import PublicEventDetailView, PublicEventListView

urlpatterns = [
    path("", PublicEventListView.as_view(), name="public-events"),
    path("<slug:slug>/", PublicEventDetailView.as_view(), name="public-event"),
]
