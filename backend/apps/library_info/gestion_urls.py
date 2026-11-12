from django.urls import path

from .gestion_views import LibrarySettingsView

urlpatterns = [
    path("parametres/", LibrarySettingsView.as_view(), name="staff-library-settings"),
]
