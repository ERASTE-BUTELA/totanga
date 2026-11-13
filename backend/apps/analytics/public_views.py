"""Point d'entrée public pour la collecte (CSRF, sans réponse riche)."""

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication

from .collect import record_public_hit


class VisitWriteThrottle(SimpleRateThrottle):
    scope = "site_visits"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        ident = request.META.get("REMOTE_ADDR") or "inconnue"
        return self.cache_format % {"scope": self.scope, "ident": ident}


@method_decorator(ensure_csrf_cookie, name="dispatch")
class PublicVisitCreateView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [VisitWriteThrottle]

    def get(self, request):
        return Response({"ok": True})

    def post(self, request):
        # Toujours 204 : la page publique ne doit jamais dépendre du résultat.
        record_public_hit(
            request,
            path=request.data.get("path", ""),
            referrer=request.data.get("referrer", ""),
            book_id=request.data.get("book_id"),
            book_title=request.data.get("book_title", ""),
            category_id=request.data.get("category_id"),
            category_name=request.data.get("category_name", ""),
            search=request.data.get("search", ""),
        )
        return Response(status=204)
