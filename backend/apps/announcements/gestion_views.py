"""Annonces du personnel."""

from datetime import datetime

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import record_staff_action
from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.catalog.models import StoredImage
from apps.catalog.validators import prepare_catalog_image

from .models import Announcement, AnnouncementCategory, AnnouncementState

DENIED = "Vous n'avez pas l'autorisation d'effectuer cette action."
LABELS = dict(AnnouncementCategory.choices)


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
    if not value:
        return timezone.now()
    parsed = parse_datetime(str(value))
    if parsed is None:
        day = parse_date(str(value)[:10])
        if day is None:
            return None
        parsed = datetime.combine(day, datetime.min.time())
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _payload(item):
    return {
        "id": item.pk,
        "title": item.title,
        "slug": item.slug,
        "category": item.category,
        "category_label": LABELS.get(item.category, item.category),
        "important": item.important,
        "body": item.body,
        "summary": " ".join(item.body.split())[:250],
        "state": item.state,
        "status": dict(AnnouncementState.choices).get(item.state, item.state),
        "published_at": item.published_at.isoformat(),
        "effective_on": item.effective_on.isoformat() if item.effective_on else None,
        "display_until": item.display_until.isoformat() if item.display_until else None,
        "image": _media(item.image),
    }


def _store_image(upload, *, alt_text, user):
    try:
        content, size, extension = prepare_catalog_image(upload)
    except ValidationError as exc:
        return None, exc.messages[0] if exc.messages else "L'image n'est pas acceptée."
    image = StoredImage(alt_text=(alt_text or "Annonce")[:200], uploaded_by=user, size=size)
    image.file.save(f"annonce.{extension}", content, save=False)
    image.save()
    return image, ""


def _apply(item, data, image, *, user):
    title = str(data.get("title", "")).strip()
    body = str(data.get("body", "")).strip()
    category = str(data.get("category", "")).strip()
    if not title:
        return "Le titre est obligatoire."
    if not body:
        return "Le texte est obligatoire."
    if category not in LABELS:
        return "La catégorie n'est pas reconnue."
    published_at = _moment(data.get("published_at"))
    if published_at is None:
        return "La date de publication n'est pas valide."
    effective = str(data.get("effective_on", "") or "").strip()
    display_until = str(data.get("display_until", "") or "").strip()
    item.title = title[:255]
    item.body = body
    item.category = category
    item.important = str(data.get("important", "")).lower() in {"true", "1", "on"}
    item.published_at = published_at
    item.effective_on = parse_date(effective) if effective else None
    item.display_until = parse_date(display_until) if display_until else None
    if effective and item.effective_on is None:
        return "La date d'effet n'est pas valide."
    if display_until and item.display_until is None:
        return "La fin d'affichage n'est pas valide."
    state = str(data.get("state", "")).strip()
    if state not in dict(AnnouncementState.choices):
        state = AnnouncementState.DRAFT
    if item.pk and item.state == AnnouncementState.ARCHIVED and state != AnnouncementState.ARCHIVED:
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
        return exc.messages[0] if exc.messages else "L'annonce n'est pas valide."
    return ""


class AnnouncementListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "announcements.view_announcement")
        if denied:
            return denied
        items = Announcement.objects.select_related("image")
        query = str(request.GET.get("q", "")).strip()
        if query:
            items = items.filter(title__unaccent__icontains=query)
        category = str(request.GET.get("categorie", "")).strip()
        if category:
            items = items.filter(category=category)
        state = str(request.GET.get("etat", "")).strip()
        if state in dict(AnnouncementState.choices):
            items = items.filter(state=state)
        if str(request.GET.get("importante", "")).lower() in {"true", "1"}:
            items = items.filter(important=True)
        page, total, number, pages = _page(request, items.order_by("-published_at", "title"))
        return Response(
            {"count": total, "page": number, "pages": pages, "results": [_payload(item) for item in page]}
        )

    def post(self, request):
        denied = _needs(request, "announcements.add_announcement")
        if denied:
            return denied
        item = Announcement()
        with transaction.atomic():
            error = _apply(item, request.data, request.FILES.get("image"), user=request.user)
            if error:
                transaction.set_rollback(True)
                return _fail(error)
        record_staff_action(actor=request.user, action="annonce_ajout", target_type="announcements.Announcement", target_id=item.pk)
        return Response(_payload(item), status=201)


class AnnouncementDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, pk):
        denied = _needs(request, "announcements.view_announcement")
        if denied:
            return denied
        item = Announcement.objects.filter(pk=pk).select_related("image").first()
        if item is None:
            return _fail("Cette annonce n'existe pas.", 404)
        return Response(_payload(item))

    def patch(self, request, pk):
        denied = _needs(request, "announcements.change_announcement")
        if denied:
            return denied
        item = Announcement.objects.filter(pk=pk).first()
        if item is None:
            return _fail("Cette annonce n'existe pas.", 404)
        keys = set(request.data.keys())
        if not request.FILES and keys <= {"state"}:
            state = str(request.data.get("state", "")).strip()
            if state not in dict(AnnouncementState.choices):
                return _fail("L'état n'est pas reconnu.")
            item.state = state
            item.save()
            action = {
                AnnouncementState.PUBLISHED: "annonce_publication",
                AnnouncementState.DRAFT: "annonce_depublication",
                AnnouncementState.ARCHIVED: "annonce_archivage",
            }[state]
            record_staff_action(actor=request.user, action=action, target_type="announcements.Announcement", target_id=item.pk)
            return Response(_payload(item))
        with transaction.atomic():
            error = _apply(item, request.data, request.FILES.get("image"), user=request.user)
            if error:
                transaction.set_rollback(True)
                return _fail(error)
        record_staff_action(actor=request.user, action="annonce_modification", target_type="announcements.Announcement", target_id=item.pk)
        return Response(_payload(item))
