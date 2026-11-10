from django.urls import path

from .views import VisitorMessageListCreateView

urlpatterns = [
    path("", VisitorMessageListCreateView.as_view(), name="visitor-messages"),
]
