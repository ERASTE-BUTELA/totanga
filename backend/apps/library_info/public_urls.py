from django.urls import path

from .public_views import LibraryPublicView

urlpatterns = [
    path("", LibraryPublicView.as_view(), name="public-library"),
]
