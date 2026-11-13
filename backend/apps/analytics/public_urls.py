from django.urls import path

from .public_views import PublicVisitCreateView

urlpatterns = [
    path("", PublicVisitCreateView.as_view(), name="public-site-visit"),
]
