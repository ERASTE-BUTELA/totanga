from django.urls import path

from .gestion_views import (
    AuthorDetailView,
    AuthorListView,
    BookArchiveView,
    BookDetailView,
    BookListView,
    BookPublishView,
    BookUnpublishView,
    CategoryDetailView,
    CategoryListView,
    CopyDetailView,
    CopyListView,
)

urlpatterns = [
    path("auteurs/", AuthorListView.as_view(), name="staff-authors"),
    path("auteurs/<int:pk>/", AuthorDetailView.as_view(), name="staff-author"),
    path("categories/", CategoryListView.as_view(), name="staff-categories"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="staff-category"),
    path("livres/", BookListView.as_view(), name="staff-books"),
    path("livres/<int:pk>/", BookDetailView.as_view(), name="staff-book"),
    path("livres/<int:pk>/publier/", BookPublishView.as_view(), name="staff-book-publish"),
    path("livres/<int:pk>/depublier/", BookUnpublishView.as_view(), name="staff-book-unpublish"),
    path("livres/<int:pk>/archiver/", BookArchiveView.as_view(), name="staff-book-archive"),
    path("livres/<int:pk>/exemplaires/", CopyListView.as_view(), name="staff-copies"),
    path("livres/<int:pk>/exemplaires/<int:copy_pk>/", CopyDetailView.as_view(), name="staff-copy"),
]
