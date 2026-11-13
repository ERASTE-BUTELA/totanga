from django.urls import path

from .gestion_views import SiteStatisticsView

urlpatterns = [
    path("statistiques/", SiteStatisticsView.as_view(), name="staff-site-statistics"),
]
