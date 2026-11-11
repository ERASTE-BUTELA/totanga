from django.urls import path

from .public_views import PublicAnnouncementDetailView, PublicAnnouncementListView

urlpatterns = [
    path("", PublicAnnouncementListView.as_view(), name="public-announcements"),
    path("<slug:slug>/", PublicAnnouncementDetailView.as_view(), name="public-announcement"),
]
