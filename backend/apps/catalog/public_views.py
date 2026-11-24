"""Consultation publique du catalogue. Lecture seule, livres publiés seulement."""

from django.db.models import Exists, OuterRef, Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication

from .gestion_views import _bounds, _cover_url
from .models import Author, Book, BookState, Category, Copy, CopyStatus, Publisher
from .search import filter_books, fold_text


class CatalogReadThrottle(SimpleRateThrottle):
    scope = "catalog_read"

    def get_cache_key(self, request, view):
        ident = request.META.get("REMOTE_ADDR") or "inconnue"
        return self.cache_format % {"scope": self.scope, "ident": ident}


def _published():
    return (
        Book.objects.published()
        .select_related("category", "category__parent", "cover_image", "publisher")
        .prefetch_related("authors", "copies", "keywords")
        .with_copy_counts()
    )


def _public_category(category):
    parent = category.parent if getattr(category, "parent_id", None) else None
    return {
        "id": category.pk,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "parent_id": parent.pk if parent else None,
        "parent_name": parent.name if parent else "",
        "parent_slug": parent.slug if parent else "",
        "is_class": parent is None,
    }


def _public_copy(copy):
    return {
        "id": copy.pk,
        "call_number": copy.call_number,
        "inventory_number": copy.inventory_number or "",
        "fonds": copy.fonds,
        "secondary_call_number": copy.secondary_call_number,
        "section": copy.section,
        "shelf": copy.shelf,
        "status": copy.status,
        "acquired_on": copy.acquired_on.isoformat() if copy.acquired_on else None,
    }


def _public_author(author):
    return {"id": author.id, "name": author.name, "biography": author.biography, "photo": ""}


def _public_publisher(publisher):
    return {"id": publisher.pk, "name": publisher.name}


def _public_book(book, *, with_copies=False, brief=False):
    authors = [{"id": author.id, "name": author.name} for author in book.authors.all()]
    if not brief:
        authors = [_public_author(author) for author in book.authors.all()]
    payload = {
        "id": book.id,
        "title": book.title,
        "slug": book.slug,
        "authors": authors,
        "category": _public_category(book.category) if book.category_id else None,
        "publication_year": book.publication_year,
        "cover": _cover_url(book),
        "available": book.is_available,
    }
    if brief:
        return payload
    payload.update(
        {
            "summary": book.summary,
            "language": book.language,
            "publisher": book.publisher.name if book.publisher_id else "",
            "isbn": book.isbn or "",
            "page_count": book.page_count,
            "keywords": [item.label for item in book.keywords.all()],
        }
    )
    if with_copies:
        payload["copies"] = [_public_copy(copy) for copy in book.copies.all()]
    return payload


def _autocomplete_limit(request, default=20):
    try:
        return min(50, max(1, int(request.GET.get("page_size", default))))
    except (TypeError, ValueError):
        return default


def _name_query(queryset, field, raw):
    folded = fold_text(raw).strip()
    if not folded:
        return queryset
    tokens = [part for part in folded.split() if part]
    for token in tokens:
        queryset = queryset.filter(**{f"{field}__unaccent__icontains": token})
    return queryset


def _public_filters(request, books):
    query = str(request.GET.get("q", "")).strip()
    if query:
        books = filter_books(books, query)
    author = str(request.GET.get("auteur", "")).strip()
    if author.isdigit():
        books = books.filter(authors__id=int(author))
    elif author:
        books = books.filter(authors__name__unaccent__icontains=author)
    publisher = str(request.GET.get("editeur", "")).strip()
    if publisher.isdigit():
        books = books.filter(publisher_id=int(publisher))
    elif publisher:
        books = books.filter(publisher__name__unaccent__icontains=publisher)
    language = str(request.GET.get("langue", "")).strip()
    if language:
        books = books.filter(language=language)
    year_min = str(request.GET.get("annee_min", "")).strip()
    year_max = str(request.GET.get("annee_max", "")).strip()
    if year_min.isdigit():
        books = books.filter(publication_year__gte=int(year_min))
    if year_max.isdigit():
        books = books.filter(publication_year__lte=int(year_max))
    return books.distinct()


class PublicBookListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request):
        books = _public_filters(request, Book.objects.published())
        category = str(request.GET.get("categorie", "")).strip()
        slugs = [part.strip() for part in category.split(",") if part.strip()]
        if slugs and all(part.isdigit() for part in slugs):
            selected = Category.objects.filter(pk__in=[int(part) for part in slugs])
        elif slugs:
            selected = Category.objects.filter(slug__in=slugs)
        else:
            selected = None
        if selected is not None:
            ids = list(selected.values_list("pk", flat=True))
            # Une classe inclut ses sous-classes ; une sous-classe reste exacte.
            class_ids = list(selected.filter(parent__isnull=True).values_list("pk", flat=True))
            if class_ids:
                ids.extend(Category.objects.filter(parent_id__in=class_ids).values_list("pk", flat=True))
            books = books.filter(category_id__in=ids)
        availability = str(request.GET.get("disponibilite", "")).strip()
        in_stock = Copy.objects.filter(book_id=OuterRef("pk"), status=CopyStatus.AVAILABLE)
        if availability == "disponible":
            books = books.filter(Exists(in_stock))
        elif availability == "indisponible":
            books = books.filter(~Exists(in_stock))
        sort = str(request.GET.get("tri", "")).strip()
        if sort == "annee":
            books = books.order_by("-publication_year", "title", "pk")
        elif sort == "recent":
            books = books.order_by("-created_at", "title", "pk")
        elif sort == "titre":
            books = books.order_by("title", "pk")
        elif str(request.GET.get("q", "")).strip():
            books = books.order_by("-search_similarity", "title", "pk")
        else:
            books = books.order_by("title", "pk")
        total = books.count()
        start, end, number, pages = _bounds(request, total)
        page = (
            books.select_related("category", "category__parent", "cover_image")
            .prefetch_related("authors")
            .with_copy_counts()[start:end]
        )
        query = str(request.GET.get("q", "")).strip()
        if query:
            from apps.analytics.interest import note_search

            note_search(request, query)
        if selected is not None:
            from apps.analytics.interest import note_category_consult

            for category in selected[:3]:
                note_category_consult(request, category)
        return Response(
            {
                "count": total,
                "page": number,
                "pages": pages,
                "results": [_public_book(book, brief=True) for book in page],
            }
        )


class PublicBookDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request, slug):
        book = _published().filter(slug=slug).first()
        if book is None:
            return Response({"detail": "Ce livre n'est pas disponible."}, status=404)
        similar = (
            _published()
            .filter(category_id=book.category_id)
            .exclude(pk=book.pk)
            .order_by("title")[:4]
        )
        payload = _public_book(book, with_copies=True)
        payload["similar"] = [_public_book(item) for item in similar]
        from apps.analytics.interest import note_book_consult

        note_book_consult(request, book)
        return Response(payload)


class PublicCategoryListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request):
        published_ids = Book.objects.filter(state=BookState.PUBLISHED).values("category_id")
        parent = str(request.GET.get("parent", "")).strip()
        query = str(request.GET.get("q", "")).strip()
        limit = _autocomplete_limit(request)

        selected_id = str(request.GET.get("id", "")).strip()
        if selected_id.isdigit():
            row = Category.objects.filter(pk=int(selected_id)).select_related("parent").first()
            return Response({"results": [_public_category(row)] if row else []})

        if parent.isdigit():
            categories = Category.objects.filter(parent_id=int(parent), pk__in=published_ids)
        elif parent:
            parent_row = Category.objects.filter(slug=parent, parent__isnull=True).first()
            if parent_row is None:
                return Response({"results": []})
            categories = Category.objects.filter(parent_id=parent_row.pk, pk__in=published_ids)
        else:
            # Classes (racines) présentes directement ou via une sous-classe publiée.
            parent_ids = Category.objects.filter(pk__in=published_ids, parent__isnull=False).values("parent_id")
            categories = Category.objects.filter(parent__isnull=True).filter(
                Q(pk__in=published_ids) | Q(pk__in=parent_ids)
            )

        categories = _name_query(categories, "name", query).order_by("name")[:limit]
        return Response({"results": [_public_category(item) for item in categories]})


class PublicAuthorListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request):
        selected_id = str(request.GET.get("id", "")).strip()
        if selected_id.isdigit():
            row = Author.objects.filter(pk=int(selected_id), books__state=BookState.PUBLISHED).first()
            return Response({"results": [_public_author(row)] if row else []})
        query = str(request.GET.get("q", "")).strip()
        limit = _autocomplete_limit(request)
        authors = Author.objects.filter(books__state=BookState.PUBLISHED).distinct()
        authors = _name_query(authors, "name", query).order_by("name")[:limit]
        return Response({"results": [_public_author(author) for author in authors]})


class PublicPublisherListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request):
        selected_id = str(request.GET.get("id", "")).strip()
        if selected_id.isdigit():
            row = Publisher.objects.filter(pk=int(selected_id), books__state=BookState.PUBLISHED).first()
            return Response({"results": [_public_publisher(row)] if row else []})
        query = str(request.GET.get("q", "")).strip()
        limit = _autocomplete_limit(request)
        publishers = Publisher.objects.filter(books__state=BookState.PUBLISHED).distinct()
        publishers = _name_query(publishers, "name", query).order_by("name")[:limit]
        return Response({"results": [_public_publisher(item) for item in publishers]})
