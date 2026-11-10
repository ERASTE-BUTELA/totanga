from django.urls import path

from .gestion_views import AccountView, SessionView, StaffUserListView

urlpatterns = [
    path("session/", SessionView.as_view(), name="staff-session"),
    path("compte/", AccountView.as_view(), name="staff-account"),
    path("utilisateurs/", StaffUserListView.as_view(), name="staff-users"),
]
