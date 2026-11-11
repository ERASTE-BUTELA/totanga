from django.urls import path

from .gestion_views import AnnouncementDetailView, AnnouncementListView

urlpatterns = [
    path("annonces/", AnnouncementListView.as_view(), name="staff-announcements"),
    path("annonces/<int:pk>/", AnnouncementDetailView.as_view(), name="staff-announcement"),
]
