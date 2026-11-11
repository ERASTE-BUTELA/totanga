"""Événements du personnel."""

import json

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import record_staff_action
from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.catalog.models import StoredImage
from apps.catalog.validators import prepare_catalog_image
from apps.common.links import http_url

from .models import Event, EventState, EventType, Speaker

DENIED = "Vous n'avez pas l'autorisation d'effectuer cette action."
TYPES = dict(EventType.choices)


def _denied():
    return Response({"detail": DENIED}, status=403)


def _needs(request, codename):
    if request.user.has_perm(codename):
        return None
    return _denied()


def _fail(message, status=400):
    return Response({"detail": message}, status=status)


def _media(image):
    if image is None:
        return ""
    url = image.file.url
    return url if url.startswith("/") else f"/{url}"


def _page(request, queryset):
    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(100, max(1, int(request.GET.get("page_size", 20))))
    except (TypeError, ValueError):
        page_size = 20
    total = queryset.count()
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    start = (page - 1) * page_size
    return queryset[start : start + page_size], total, page, pages


def _moment(value):
    parsed = parse_datetime(str(value or ""))
    if parsed is None and value:
        parsed = parse_datetime(f"{str(value)[:16]}:00")
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _list(value):
    if isinstance(value, list):
        return value
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return None
    return parsed if isinstance(parsed, list) else None


def _speaker_payload(speaker):
    return {
        "id": speaker.pk,
        "name": speaker.name,
        "title": speaker.title,
        "position": speaker.position,
        "photo": _media(speaker.photo),
    }


def _payload(item):
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
        "registration_url": item.registration_url,
        "programme": item.programme,
        "state": item.state,
        "status": dict(EventState.choices).get(item.state, item.state),
        "image": _media(item.image),
        "speakers": [_speaker_payload(speaker) for speaker in item.speakers.all()],
    }


def _store_image(upload, *, alt_text, user):
    try:
        content, size, extension = prepare_catalog_image(upload)
    except ValidationError as exc:
        return None, exc.messages[0] if exc.messages else "L'image n'est pas acceptée."
    image = StoredImage(alt_text=(alt_text or "Événement")[:200], uploaded_by=user, size=size)
    image.file.save(f"evenement.{extension}", content, save=False)
    image.save()
    return image, ""


def _store_speakers(item, raw, files, user):
    speakers = _list(raw)
    if speakers is None:
        return "Les intervenants sont illisibles."
    if len(speakers) > 5:
        return "Un événement a au plus cinq intervenants."
    kept_photos = {speaker.position: speaker.photo_id for speaker in item.speakers.all()}
    prepared = []
    seen = set()
    for index, speaker in enumerate(speakers, start=1):
        if not isinstance(speaker, dict):
            return "Un intervenant est incomplet."
        name = str(speaker.get("name", "")).strip()
        if not name:
            return "Chaque intervenant a un nom."
        position = speaker.get("position") or index
        try:
            position = int(position)
        except (TypeError, ValueError):
            return "L'ordre d'un intervenant n'est pas valide."
        if position < 1 or position > 5 or position in seen:
            return "L'ordre des intervenants va de 1 à 5, sans doublon."
        seen.add(position)
        prepared.append((position, name[:200], str(speaker.get("title", "")).strip()[:200]))
    item.speakers.all().delete()
    for position, name, title in prepared:
        photo = None
        upload = files.get(f"speaker_photo_{position}")
        if upload:
            photo, error = _store_image(upload, alt_text=name, user=user)
            if error:
                return error
        elif position in kept_photos:
            photo_id = kept_photos[position]
            photo = StoredImage.objects.filter(pk=photo_id).first() if photo_id else None
        Speaker.objects.create(event=item, position=position, name=name, title=title, photo=photo)
    return ""


def _apply(item, data, image, files, *, user):
    title = str(data.get("title", "")).strip()
    summary = str(data.get("summary", "")).strip()
    event_type = str(data.get("event_type", "")).strip()
    location = str(data.get("location", "")).strip()
    if not title:
        return "Le titre est obligatoire."
    if not summary:
        return "Le résumé est obligatoire."
    if event_type not in TYPES:
        return "Le type n'est pas reconnu."
    if not location:
        return "Le lieu est obligatoire."
    starts_at = _moment(data.get("starts_at"))
    ends_at = _moment(data.get("ends_at"))
    if starts_at is None or ends_at is None:
        return "Les dates de l'événement sont obligatoires."
    if ends_at <= starts_at:
        return "La fin doit être après le début."
    capacity = str(data.get("capacity", "") or "").strip()
    capacity_value = None
    if capacity:
        try:
            capacity_value = int(capacity)
        except ValueError:
            return "Le nombre de places n'est pas valide."
        if capacity_value < 0:
            return "Le nombre de places n'est pas valide."
    item.title = title[:255]
    item.summary = summary
    item.event_type = event_type
    item.location = location[:200]
    item.audience = str(data.get("audience", "")).strip()[:200]
    item.capacity = capacity_value
    item.registration_url = http_url(data.get("registration_url"))
    item.programme = str(data.get("programme", "") or "").strip()
    item.starts_at = starts_at
    item.ends_at = ends_at
    state = str(data.get("state", "")).strip()
    if state not in dict(EventState.choices):
        state = EventState.DRAFT
    if item.pk and item.state == EventState.ARCHIVED and state != EventState.ARCHIVED:
        state = item.state
    item.state = state
    if image:
        stored, error = _store_image(image, alt_text=title, user=user)
        if error:
            return error
        item.image = stored
    elif str(data.get("remove_image", "")).lower() in {"true", "1", "on"}:
        item.image = None
    try:
        item.save()
    except ValidationError as exc:
        return exc.messages[0] if exc.messages else "L'événement n'est pas valide."
    return _store_speakers(item, data.get("speakers", "[]"), files, user)


class EventListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "events.view_event")
        if denied:
            return denied
        items = Event.objects.select_related("image").prefetch_related("speakers")
        query = str(request.GET.get("q", "")).strip()
        if query:
            items = items.filter(title__unaccent__icontains=query)
        event_type = str(request.GET.get("type", "")).strip()
        if event_type in TYPES:
            items = items.filter(event_type=event_type)
        state = str(request.GET.get("etat", "")).strip()
        if state in dict(EventState.choices):
            items = items.filter(state=state)
        page, total, number, pages = _page(request, items.order_by("starts_at", "title"))
        return Response({"count": total, "page": number, "pages": pages, "results": [_payload(item) for item in page]})

    def post(self, request):
        denied = _needs(request, "events.add_event")
        if denied:
            return denied
        item = Event()
        try:
            with transaction.atomic():
                error = _apply(item, request.data, request.FILES.get("image"), request.FILES, user=request.user)
                if error:
                    transaction.set_rollback(True)
                    return _fail(error)
        except IntegrityError:
            return _fail("Les intervenants ne sont pas valides.")
        record_staff_action(actor=request.user, action="evenement_ajout", target_type="events.Event", target_id=item.pk)
        return Response(_payload(item), status=201)


class EventDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, pk):
        denied = _needs(request, "events.view_event")
        if denied:
            return denied
        item = Event.objects.filter(pk=pk).select_related("image").prefetch_related("speakers__photo").first()
        if item is None:
            return _fail("Cet événement n'existe pas.", 404)
        return Response(_payload(item))

    def patch(self, request, pk):
        denied = _needs(request, "events.change_event")
        if denied:
            return denied
        item = Event.objects.filter(pk=pk).first()
        if item is None:
            return _fail("Cet événement n'existe pas.", 404)
        keys = set(request.data.keys())
        if not request.FILES and keys <= {"state"}:
            state = str(request.data.get("state", "")).strip()
            if state not in dict(EventState.choices):
                return _fail("L'état n'est pas reconnu.")
            item.state = state
            item.save()
            action = {
                EventState.PUBLISHED: "evenement_publication",
                EventState.DRAFT: "evenement_depublication",
                EventState.ARCHIVED: "evenement_archivage",
            }[state]
            record_staff_action(actor=request.user, action=action, target_type="events.Event", target_id=item.pk)
            return Response(_payload(item))
        try:
            with transaction.atomic():
                error = _apply(item, request.data, request.FILES.get("image"), request.FILES, user=request.user)
                if error:
                    transaction.set_rollback(True)
                    return _fail(error)
        except IntegrityError:
            return _fail("Les intervenants ne sont pas valides.")
        record_staff_action(actor=request.user, action="evenement_modification", target_type="events.Event", target_id=item.pk)
        return Response(_payload(item))
