from django.urls import path

from .gestion_views import EventDetailView, EventListView

urlpatterns = [
    path("evenements/", EventListView.as_view(), name="staff-events"),
    path("evenements/<int:pk>/", EventDetailView.as_view(), name="staff-event"),
]
