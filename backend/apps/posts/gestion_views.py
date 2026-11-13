"""Publications du personnel."""

from datetime import datetime

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
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
from apps.library_info.html import sanitize_rich_text

from .models import Publication, PublicationCategory, PublicationState

DENIED = "Vous n'avez pas l'autorisation d'effectuer cette action."
STATUS_TO_CODE = {
    "draft": PublicationState.DRAFT,
    "published": PublicationState.PUBLISHED,
    "archived": PublicationState.ARCHIVED,
    "Brouillon": PublicationState.DRAFT,
    "Publié": PublicationState.PUBLISHED,
    "Archivé": PublicationState.ARCHIVED,
}


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
        "author": item.author_name,
        "excerpt": item.excerpt,
        "content": item.content,
        "state": item.state,
        "status": dict(PublicationState.choices).get(item.state, item.state),
        "featured": item.featured,
        "pinned": item.pinned,
        "published_at": item.published_at.isoformat(),
        "publishedAt": item.published_at.strftime("%Y-%m-%dT%H:%M"),
        "image": _media(item.image),
        "order": 0 if item.pinned else 1,
    }


def _store_image(upload, *, alt_text, user):
    try:
        content, size, extension = prepare_catalog_image(upload)
    except ValidationError as exc:
        return None, exc.messages[0] if exc.messages else "L'image n'est pas acceptée."
    image = StoredImage(alt_text=(alt_text or "Publication")[:200], uploaded_by=user, size=size)
    image.file.save(f"publication.{extension}", content, save=False)
    image.save()
    return image, ""


def _apply(item, data, upload, *, user):
    title = str(data.get("title", "")).strip()
    if not title:
        return "Le titre est obligatoire."
    category = str(data.get("category", "")).strip() or PublicationCategory.CULTURE
    if category not in dict(PublicationCategory.choices):
        return "La catégorie n'est pas reconnue."
    excerpt = str(data.get("excerpt", "")).strip()
    if not excerpt:
        return "Le résumé est obligatoire."
    if len(excerpt) > 250:
        return "Le résumé ne dépasse pas 250 caractères."
    content = sanitize_rich_text(str(data.get("content", "")))
    if not content.strip() or content.strip() in {"<p></p>", "<p><br></p>"}:
        return "Le contenu est obligatoire."
    published_at = _moment(data.get("published_at") or data.get("publishedAt"))
    if published_at is None:
        return "La date de publication n'est pas valide."
    state = str(data.get("state") or data.get("status") or item.state or PublicationState.DRAFT).strip()
    state = STATUS_TO_CODE.get(state, state)
    if state not in dict(PublicationState.choices):
        return "L'état n'est pas reconnu."
    featured = str(data.get("featured", item.featured)).lower() in {"true", "1", "on"}
    pinned = str(data.get("pinned", item.pinned)).lower() in {"true", "1", "on"}
    if upload:
        stored, error = _store_image(upload, alt_text=title[:200], user=user)
        if error:
            return error
        item.image = stored
    elif str(data.get("remove_image", "")).lower() in {"true", "1", "on"}:
        item.image = None
    item.title = title[:255]
    item.category = category
    item.author_name = (str(data.get("author", "")).strip() or "Équipe Totanga")[:200]
    item.excerpt = excerpt[:250]
    item.content = content
    item.published_at = published_at
    item.state = state
    item.featured = featured
    item.pinned = pinned
    try:
        item.save()
    except ValidationError as exc:
        return exc.messages[0] if exc.messages else "La publication n'est pas acceptée."
    return ""


class PublicationListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "posts.view_publication")
        if denied:
            return denied
        items = Publication.objects.select_related("image").all()
        query = str(request.GET.get("q", "")).strip()
        if query:
            items = items.filter(Q(title__icontains=query) | Q(excerpt__icontains=query) | Q(author_name__icontains=query))
        page, total, number, pages = _page(request, items)
        return Response(
            {
                "count": total,
                "page": number,
                "pages": pages,
                "results": [_payload(item) for item in page],
            }
        )

    def post(self, request):
        denied = _needs(request, "posts.add_publication")
        if denied:
            return denied
        item = Publication(published_at=timezone.now())
        with transaction.atomic():
            error = _apply(item, request.data, request.FILES.get("image"), user=request.user)
            if error:
                transaction.set_rollback(True)
                return _fail(error)
        record_staff_action(actor=request.user, action="publication_ajout", target_type="posts.Publication", target_id=item.pk)
        return Response(_payload(item), status=201)


class PublicationDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, pk):
        denied = _needs(request, "posts.view_publication")
        if denied:
            return denied
        item = Publication.objects.filter(pk=pk).select_related("image").first()
        if item is None:
            return _fail("Cette publication n'existe pas.", 404)
        return Response(_payload(item))

    def patch(self, request, pk):
        denied = _needs(request, "posts.change_publication")
        if denied:
            return denied
        item = Publication.objects.filter(pk=pk).first()
        if item is None:
            return _fail("Cette publication n'existe pas.", 404)
        keys = set(request.data.keys())
        if not request.FILES and keys <= {"state", "status", "featured", "pinned"}:
            if "featured" in request.data:
                item.featured = str(request.data.get("featured", "")).lower() in {"true", "1", "on"}
            if "pinned" in request.data:
                item.pinned = str(request.data.get("pinned", "")).lower() in {"true", "1", "on"}
            if "state" in request.data or "status" in request.data:
                state = str(request.data.get("state") or request.data.get("status") or "").strip()
                state = STATUS_TO_CODE.get(state, state)
                if state not in dict(PublicationState.choices):
                    return _fail("L'état n'est pas reconnu.")
                item.state = state
            item.save()
            record_staff_action(actor=request.user, action="publication_modification", target_type="posts.Publication", target_id=item.pk)
            return Response(_payload(item))
        with transaction.atomic():
            error = _apply(item, request.data, request.FILES.get("image"), user=request.user)
            if error:
                transaction.set_rollback(True)
                return _fail(error)
        record_staff_action(actor=request.user, action="publication_modification", target_type="posts.Publication", target_id=item.pk)
        return Response(_payload(item))

    def delete(self, request, pk):
        denied = _needs(request, "posts.delete_publication")
        if denied:
            return denied
        item = Publication.objects.filter(pk=pk).first()
        if item is None:
            return _fail("Cette publication n'existe pas.", 404)
        item_id = item.pk
        item.delete()
        record_staff_action(
            actor=request.user,
            action="publication_suppression",
            target_type="posts.Publication",
            target_id=item_id,
        )
        return Response(status=204)
