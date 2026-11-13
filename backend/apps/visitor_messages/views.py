from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication

from .models import VisitorMessage
from .serializers import VisitorMessageCreateSerializer, VisitorMessagePublicSerializer


class VisitorMessageThrottle(SimpleRateThrottle):
    scope = "visitor_messages"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        # L'adresse réelle de la connexion, pas X-Forwarded-For : cet en-tête
        # se fabrique et servirait à contourner la limite.
        ident = request.META.get("REMOTE_ADDR") or "inconnue"
        return self.cache_format % {"scope": self.scope, "ident": ident}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class VisitorMessageListCreateView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [VisitorMessageThrottle]

    def get(self, request):
        # Accueil : uniquement les avis publics, pas les messages de contact.
        messages = VisitorMessage.objects.filter(kind=VisitorMessage.KIND_AVIS)[:40]
        return Response(VisitorMessagePublicSerializer(messages, many=True).data)

    def post(self, request):
        serializer = VisitorMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return Response(VisitorMessagePublicSerializer(message).data, status=status.HTTP_201_CREATED)
