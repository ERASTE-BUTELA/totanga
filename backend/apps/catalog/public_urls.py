from django.urls import path

from .public_views import (
    PublicAuthorListView,
    PublicBookDetailView,
    PublicBookListView,
    PublicCategoryListView,
    PublicPublisherListView,
)

urlpatterns = [
    path("livres/", PublicBookListView.as_view(), name="public-books"),
    path("livres/<slug:slug>/", PublicBookDetailView.as_view(), name="public-book"),
    path("categories/", PublicCategoryListView.as_view(), name="public-categories"),
    path("auteurs/", PublicAuthorListView.as_view(), name="public-authors"),
    path("editeurs/", PublicPublisherListView.as_view(), name="public-publishers"),
]
