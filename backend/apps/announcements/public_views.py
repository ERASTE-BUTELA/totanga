"""Consultation publique des annonces."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication

from .gestion_views import LABELS, _media, _page
from .models import visible_announcements


class ContentReadThrottle(SimpleRateThrottle):
    scope = "content_read"

    def get_cache_key(self, request, view):
        ident = request.META.get("REMOTE_ADDR") or "inconnue"
        return self.cache_format % {"scope": self.scope, "ident": ident}


def _public(item):
    return {
        "id": item.pk,
        "title": item.title,
        "slug": item.slug,
        "summary": " ".join(item.body.split())[:250],
        "body": item.body,
        "category": item.category,
        "category_label": LABELS.get(item.category, item.category),
        "important": item.important,
        "kind": "important" if item.important else "news",
        "published_on": item.published_at.isoformat(),
        "effective_on": item.effective_on.isoformat() if item.effective_on else None,
        "display_until": item.display_until.isoformat() if item.display_until else None,
        "image": _media(item.image),
    }


class PublicAnnouncementListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [ContentReadThrottle]

    def get(self, request):
        items = visible_announcements().select_related("image").order_by("-published_at", "title")
        category = str(request.GET.get("categorie", "")).strip()
        if category in LABELS:
            items = items.filter(category=category)
        page, total, number, pages = _page(request, items)
        return Response(
            {"count": total, "page": number, "pages": pages, "results": [_public(item) for item in page]}
        )


class PublicAnnouncementDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [ContentReadThrottle]

    def get(self, request, slug):
        item = visible_announcements().filter(slug=slug).select_related("image").first()
        if item is None:
            return Response({"detail": "Cette annonce n'est pas disponible."}, status=404)
        return Response(_public(item))
