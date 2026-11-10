from django.urls import path

from .gestion_views import (
    AuthorDetailView,
    AuthorListView,
    BookDetailView,
    BookListView,
    CategoryDetailView,
    CategoryListView,
)

urlpatterns = [
    path("auteurs/", AuthorListView.as_view(), name="staff-authors"),
    path("auteurs/<int:pk>/", AuthorDetailView.as_view(), name="staff-author"),
    path("categories/", CategoryListView.as_view(), name="staff-categories"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="staff-category"),
    path("livres/", BookListView.as_view(), name="staff-books"),
    path("livres/<int:pk>/", BookDetailView.as_view(), name="staff-book"),
]
