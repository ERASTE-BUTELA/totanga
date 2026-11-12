"""Consultation publique du catalogue. Lecture seule, livres publiés seulement."""

from django.db.models import Count, Exists, OuterRef, Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication

from .gestion_views import _bounds, _cover_url
from .models import Author, Book, BookState, Category, Copy, CopyStatus
from .search import filter_books


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
        "parent_name": parent.name if parent else "",
        "parent_slug": parent.slug if parent else "",
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


def _public_filters(request, books):
    query = str(request.GET.get("q", "")).strip()
    if query:
        books = filter_books(books, query)
    author = str(request.GET.get("auteur", "")).strip()
    if author.isdigit():
        books = books.filter(authors__id=int(author))
    elif author:
        books = books.filter(authors__name__unaccent__icontains=author)
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


def _category_facets(books):
    rows = list(
        books.order_by()
        .values(
            "category_id",
            "category__name",
            "category__slug",
            "category__parent_id",
            "category__parent__name",
            "category__parent__slug",
        )
        .annotate(count=Count("id", distinct=True))
    )
    by_id = {item["category_id"]: item for item in rows}
    missing = {item["category__parent_id"] for item in rows if item["category__parent_id"]} - set(by_id)
    if missing:
        for parent in Category.objects.filter(pk__in=missing):
            by_id[parent.pk] = {
                "category_id": parent.pk,
                "category__name": parent.name,
                "category__slug": parent.slug,
                "category__parent_id": None,
                "category__parent__name": "",
                "category__parent__slug": "",
                "count": 0,
            }
    child_counts = {}
    for item in rows:
        parent_id = item["category__parent_id"]
        if parent_id:
            child_counts[parent_id] = child_counts.get(parent_id, 0) + item["count"]
    facets = []
    for item in by_id.values():
        facets.append(
            {
                "id": item["category_id"],
                "name": item["category__name"],
                "slug": item["category__slug"],
                "count": item["count"] + child_counts.get(item["category_id"], 0),
                "parent_name": item["category__parent__name"] or "",
                "parent_slug": item["category__parent__slug"] or "",
            }
        )
    facets.sort(key=lambda row: ((row["parent_name"] or row["name"]).casefold(), bool(row["parent_name"]), row["name"].casefold()))
    return facets


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
            ids.extend(Category.objects.filter(parent_id__in=ids).values_list("pk", flat=True))
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
        return Response(payload)


class PublicCategoryListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request):
        # Les identifiants publiés évitent le DISTINCT sur la jointure de tout le catalogue.
        published_ids = Book.objects.filter(state=BookState.PUBLISHED).values("category_id")
        parent_ids = Category.objects.filter(pk__in=published_ids, parent__isnull=False).values("parent_id")
        categories = (
            Category.objects.filter(parent__isnull=True)
            .filter(Q(pk__in=published_ids) | Q(pk__in=parent_ids))
            .order_by("name")
        )
        return Response([_public_category(item) for item in categories])


class PublicAuthorListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [CatalogReadThrottle]

    def get(self, request):
        authors = Author.objects.filter(books__state=BookState.PUBLISHED).distinct().order_by("name")
        return Response([_public_author(author) for author in authors])
