"""Lecture publique de la fiche bibliothèque."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Library
from .serializers import library_payload


class LibraryReadThrottle(AnonRateThrottle):
    scope = "content_read"


class LibraryPublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LibraryReadThrottle]

    def get(self, request):
        library = Library.get_solo()
        return Response(library_payload(library, staff=False))
