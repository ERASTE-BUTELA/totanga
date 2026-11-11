"""Consultation publique des événements."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.common.links import http_url

from .gestion_views import TYPES, _media, _page, _speaker_payload
from .models import Event, EventState


class ContentReadThrottle(SimpleRateThrottle):
    scope = "content_read"

    def get_cache_key(self, request, view):
        ident = request.META.get("REMOTE_ADDR") or "inconnue"
        return self.cache_format % {"scope": self.scope, "ident": ident}


def _published():
    return Event.objects.filter(state=EventState.PUBLISHED).select_related("image").prefetch_related("speakers__photo")


def _public(item):
    return {
        "id": item.pk,
        "title": item.title,
        "slug": item.slug,
        "summary": item.summary,
        "event_type": item.event_type,
        "type_label": TYPES.get(item.event_type, item.event_type),
        "starts_at": item.starts_at.isoformat(),
        "ends_at": item.ends_at.isoformat(),
        "location": item.location,
        "audience": item.audience,
        "capacity": item.capacity,
        "registration_url": http_url(item.registration_url),
        "programme": item.programme,
        "image": _media(item.image),
        "speakers": [_speaker_payload(speaker) for speaker in item.speakers.all()],
    }


class PublicEventListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [ContentReadThrottle]

    def get(self, request):
        items = _published().order_by("starts_at", "title")
        event_type = str(request.GET.get("type", "")).strip()
        if event_type in TYPES:
            items = items.filter(event_type=event_type)
        page, total, number, pages = _page(request, items)
        return Response({"count": total, "page": number, "pages": pages, "results": [_public(item) for item in page]})


class PublicEventDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [ContentReadThrottle]

    def get(self, request, slug):
        item = _published().filter(slug=slug).first()
        if item is None:
            return Response({"detail": "Cet événement n'est pas disponible."}, status=404)
        return Response(_public(item))
