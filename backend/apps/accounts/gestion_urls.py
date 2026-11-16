from django.urls import path

from .gestion_views import (
    AccountView,
    DashboardView,
    SessionView,
    StaffJournalView,
    StaffMessageListView,
    StaffPasswordResetView,
    StaffRoleListView,
    StaffUserListView,
)

urlpatterns = [
    path("session/", SessionView.as_view(), name="staff-session"),
    path("compte/", AccountView.as_view(), name="staff-account"),
    path("tableau-de-bord/", DashboardView.as_view(), name="staff-dashboard"),
    path("utilisateurs/", StaffUserListView.as_view(), name="staff-users"),
    path(
        "utilisateurs/<int:user_id>/mot-de-passe/",
        StaffPasswordResetView.as_view(),
        name="staff-user-password",
    ),
    path("roles/", StaffRoleListView.as_view(), name="staff-roles"),
    path("journal/", StaffJournalView.as_view(), name="staff-journal"),
    path("messages/", StaffMessageListView.as_view(), name="staff-messages"),
]
