"""API publique en lecture seule des publications."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from .gestion_views import _media
from .models import Publication, visible_publications


class ContentReadThrottle(SimpleRateThrottle):
    scope = "content_read"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def _public_payload(item, *, brief=False):
    payload = {
        "id": item.pk,
        "title": item.title,
        "slug": item.slug,
        "category": item.category,
        "author": item.author_name,
        "excerpt": item.excerpt,
        "image": _media(item.image),
        "featured": item.featured,
        "pinned": item.pinned,
        "published_at": item.published_at.isoformat(),
    }
    if not brief:
        payload["content"] = item.content
    return payload


class PublicPublicationListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ContentReadThrottle]

    def get(self, request):
        items = visible_publications().select_related("image")
        return Response([_public_payload(item, brief=True) for item in items])


class PublicPublicationDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ContentReadThrottle]

    def get(self, request, slug):
        item = visible_publications().filter(slug=slug).select_related("image").first()
        if item is None:
            return Response({"detail": "Cette publication n'existe pas."}, status=404)
        return Response(_public_payload(item))
