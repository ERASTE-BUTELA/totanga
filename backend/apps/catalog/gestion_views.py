"""Catalogue du personnel. Le serveur décide, le navigateur n'enregistre rien."""

import json
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, IntegerField, OuterRef, ProtectedError, Q, Subquery, Value
from django.db.models.functions import Coalesce
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import record_staff_action
from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.common.slugs import unique_slug

from apps.catalog.search import filter_books
from apps.catalog.validators import prepare_catalog_image

from .models import (
    REGISTER_FIELDS,
    Author,
    Book,
    BookLanguage,
    BookState,
    Category,
    Copy,
    CopyStatus,
    Keyword,
    Publisher,
    RegisterRow,
    StoredImage,
    normalize_isbn,
)

DENIED = "Vous n'avez pas l'autorisation d'effectuer cette action."
SAVED = "Enregistrement effectué."

LANGUAGE_LABELS = dict(BookLanguage.choices)
STATUS_LABELS = dict(CopyStatus.choices)
LABEL_TO_STATUS = {label: code for code, label in CopyStatus.choices}


def _denied():
    return Response({"detail": DENIED}, status=403)


def _needs(request, codename):
    if request.user.has_perm(codename):
        return None
    return _denied()


def _fail(message, status=400):
    return Response({"detail": message}, status=status)


def _media(field):
    if not field:
        return ""
    url = field.url
    return url if url.startswith("/") else f"/{url}"


def _cover_url(book):
    if not book.cover_image_id:
        return ""
    return _media(book.cover_image.file)


def _json_list(value):
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return None
    return parsed if isinstance(parsed, list) else None


def _place(section, shelf):
    if not shelf or shelf == "-":
        return section
    return f"{section} – {shelf}"


def _split_place(place):
    text = str(place or "").strip()
    if " – " in text:
        section, shelf = text.split(" – ", 1)
        return section.strip()[:80], shelf.strip()[:80]
    return text[:80], ""


def _money(amount):
    if amount is None:
        return ""
    return f"{amount:.2f}"


def _parse_price(value):
    text = str(value or "").strip().replace(" ", "").replace(",", ".")
    if not text:
        return None
    try:
        amount = Decimal(text)
    except InvalidOperation:
        return None
    if amount <= 0:
        return None
    return amount.quantize(Decimal("0.01"))


def _register_payload(copy):
    try:
        row = copy.register_row
    except RegisterRow.DoesNotExist:
        return None
    return {
        "source_line": row.source_line,
        "status": row.status,
        "label": "Ligne du registre d'origine",
        "cells": [{ "name": header, "value": getattr(row, field) } for header, field in REGISTER_FIELDS],
    }


def _copy_payload(copy):
    return {
        "id": copy.pk,
        "call_number": copy.call_number,
        "inventory_number": copy.inventory_number or "",
        "fonds": copy.fonds,
        "secondary_call_number": copy.secondary_call_number,
        "price": _money(copy.acquisition_price),
        "place": _place(copy.section, copy.shelf),
        "section": copy.section,
        "shelf": copy.shelf,
        "acquired_on": "" if copy.acquired_on is None else copy.acquired_on.isoformat(),
        "status": STATUS_LABELS.get(copy.status, copy.status),
        "register": _register_payload(copy),
    }


def _book_status(book):
    return dict(BookState.choices).get(book.state, book.state)


def _book_list_payload(book):
    available = book.available_copy_count
    total = book.copy_count
    names = [author.name for author in book.authors.all()]
    return {
        "id": book.pk,
        "title": book.title,
        "authors": ", ".join(names),
        "category": _category_label(book.category),
        "category_id": book.category_id,
        "publisher": book.publisher.name if book.publisher_id else "",
        "publisher_id": book.publisher_id,
        "isbn": book.isbn or "",
        "year": "" if book.publication_year is None else str(book.publication_year),
        "language": book.language,
        "available": available,
        "unavailable": total - available,
        "status": _book_status(book),
        "state": book.state,
        "cover": _cover_url(book),
    }


def _book_detail(book):
    payload = _book_list_payload(book)
    payload.update(
        {
            "summary": book.summary,
            "author_ids": [author.pk for author in book.authors.all()],
            "author_choices": [{"id": author.pk, "name": author.name} for author in book.authors.all()],
            "publisher": book.publisher.name if book.publisher_id else "",
            "publisher_id": book.publisher_id,
            "publisher_choice": (
                {"id": book.publisher.pk, "name": book.publisher.name} if book.publisher_id else None
            ),
            "category_choice": {
                "id": book.category.pk,
                "name": book.category.name,
                "parent_name": book.category.parent.name if book.category.parent_id else "",
            },
            "language": book.language,
            "pages": book.page_count or "",
            "keywords": [item.label for item in book.keywords.all()],
            "state": book.state,
            "copies": [_copy_payload(copy) for copy in book.copies.all()],
        }
    )
    return payload


def _author_payload(author, brief=False):
    biography = author.biography or ""
    if brief and len(biography) > 180:
        biography = f"{biography[:177]}…"
    books = author.__dict__.get("book_count")
    if books is None:
        books = author.books.count()
    return {
        "id": author.pk,
        "name": author.name,
        "biography": biography,
        "photo": _media(author.photo),
        "books": books,
    }


def _publisher_payload(publisher, brief=False):
    notes = publisher.notes or ""
    if brief and len(notes) > 180:
        notes = f"{notes[:177]}…"
    books = publisher.__dict__.get("book_count")
    if books is None:
        books = publisher.books.count()
    return {
        "id": publisher.pk,
        "name": publisher.name,
        "notes": notes,
        "books": books,
    }


def _publisher_choice(data, book=None):
    if "publisher_id" not in data and "publisher" not in data:
        return (book.publisher if book is not None else None), ""
    raw = data.get("publisher_id", data.get("publisher"))
    if raw in (None, "", "null"):
        return None, ""
    if isinstance(raw, str) and not str(raw).isdigit():
        return None, "L'éditeur indiqué n'existe pas."
    publisher = Publisher.objects.filter(pk=raw).first()
    if publisher is None:
        return None, "L'éditeur indiqué n'existe pas."
    return publisher, ""


def _parent_choice(data, category=None):
    if "parent_id" not in data and category is not None:
        return category.parent, ""
    raw = data.get("parent_id")
    if raw in (None, "", "null"):
        return None, ""
    parent = Category.objects.filter(pk=raw).first()
    if parent is None:
        return None, "La classe indiquée n'existe pas."
    if parent.parent_id:
        return None, "Une sous-classe ne peut pas contenir une autre sous-classe."
    if category is not None and parent.pk == category.pk:
        return None, "Une catégorie ne peut pas être sa propre classe."
    if category is not None and category.children.exists():
        return None, "Cette classe contient déjà des sous-classes."
    return parent, ""


def _category_label(category):
    if category is None:
        return ""
    if category.parent_id:
        return f"{category.parent.name} — {category.name}"
    return category.name


def _category_payload(category):
    parent = category.parent if category.parent_id else None
    books = category.__dict__.get("book_count")
    if books is None:
        books = category.books.count() + Book.objects.filter(category__parent=category).count()
    return {
        "id": category.pk,
        "name": category.name,
        "description": category.description,
        "parent_id": parent.pk if parent else None,
        "parent_name": parent.name if parent else "",
        "books": books,
    }


def _store_copies(book, raw_copies):
    copies = _json_list(raw_copies)
    if copies is None:
        return "Les exemplaires sont illisibles."
    seen = set()
    kept = []
    for item in copies:
        if not isinstance(item, dict):
            return "Un exemplaire est incomplet."
        inventory = str(item.get("inventory_number", "")).strip()
        if inventory and inventory in seen:
            return "Ce numéro d'inventaire est déjà utilisé."
        if inventory:
            seen.add(inventory)
        existing = None
        raw_id = item.get("id")
        if raw_id not in (None, "") and str(raw_id).isdigit():
            existing = book.copies.filter(pk=raw_id).first()
            if existing is None:
                return "Un exemplaire indiqué n'existe pas."
        if existing is None:
            existing = Copy(book=book)
        error = _copy_from_data(existing, item)
        if error:
            return error
        kept.append(existing.pk)
    book.copies.exclude(pk__in=kept).delete()
    return ""


def _apply_book(book, data, cover, *, creating, user=None):
    title = str(data.get("title", "")).strip()
    summary = str(data.get("summary", "")).strip()
    category_id = data.get("category_id")
    year = str(data.get("year", "")).strip()
    language = str(data.get("language", "")).strip()
    author_ids = _json_list(data.get("author_ids"))
    keywords = _json_list(data.get("keywords"))
    if not title:
        return "Le titre est obligatoire."
    if author_ids is None or not author_ids:
        return "Indiquez au moins un auteur."
    if keywords is None:
        keywords = []
    keywords = [str(word).strip()[:200] for word in keywords if str(word).strip()][:20]
    year_number = None
    if year:
        try:
            year_number = int(year)
        except (TypeError, ValueError):
            return "L'année de publication doit être comprise entre 1000 et 2100."
        if year_number < 1000 or year_number > 2100:
            return "L'année de publication doit être comprise entre 1000 et 2100."
    if not language:
        language = BookLanguage.FRENCH
    if language not in LANGUAGE_LABELS:
        return "La langue n'est pas reconnue."
    category = Category.objects.filter(pk=category_id).first()
    if category is None:
        return "La catégorie est obligatoire."
    authors = list(Author.objects.filter(pk__in=author_ids))
    if len(authors) != len(set(author_ids)):
        return "Un auteur indiqué n'existe pas."
    pages = str(data.get("pages", "")).strip()
    page_count = None
    if pages:
        try:
            page_count = int(pages)
        except (TypeError, ValueError):
            return "Le nombre de pages n'est pas valide."
        if page_count < 1 or page_count > 20000:
            return "Le nombre de pages n'est pas valide."
    state = str(data.get("state", "")).strip()
    if state not in dict(BookState.choices):
        state = BookState.PUBLISHED if str(data.get("published", "")).lower() in {"true", "1"} else BookState.DRAFT
    if not creating and book.state == BookState.ARCHIVED and state != BookState.ARCHIVED:
        state = book.state
    book.title = title[:400]
    book.category = category
    book.publication_year = year_number
    book.summary = summary
    book.language = language or BookLanguage.FRENCH
    publisher, publisher_error = _publisher_choice(data, None if creating else book)
    if publisher_error:
        return publisher_error
    book.publisher = publisher
    book.isbn = normalize_isbn(data.get("isbn"))
    book.page_count = page_count
    book.state = state
    if cover:
        stored, error = _store_image(cover, alt_text=title[:200], user=user)
        if error:
            return error
        book.cover_image = stored
    elif str(data.get("remove_cover", "")).lower() in {"true", "1", "on"}:
        book.cover_image = None
    if not book.slug:
        book.slug = unique_slug(Book, book.title, max_length=255, instance=book)
    try:
        book.full_clean()
        book.save()
    except ValidationError as exc:
        return exc.messages[0] if exc.messages else "La couverture n'est pas acceptée."
    book.authors.set(authors)
    _replace_keywords(book, keywords)
    copy_error = _store_copies(book, data.get("copies", "[]"))
    if copy_error:
        return copy_error
    return ""


def _store_image(upload, *, alt_text, user):
    try:
        content, size, extension = prepare_catalog_image(upload)
    except ValidationError as exc:
        return None, exc.messages[0] if exc.messages else "La couverture n'est pas acceptée."
    image = StoredImage(alt_text=(alt_text or "Couverture")[:200], uploaded_by=user, size=size)
    image.file.save(f"couverture.{extension}", content, save=False)
    image.save()
    return image, ""


def _replace_keywords(book, words):
    book.keywords.all().delete()
    seen = set()
    for word in words:
        label = " ".join(str(word).split())[:200]
        key = label.casefold()
        if not label or key in seen:
            continue
        seen.add(key)
        Keyword.objects.create(book=book, label=label)


class AuthorListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "catalog.view_author")
        if denied:
            return denied
        authors = _named_rows(request, Author.objects.all(), "biography")
        if not _wants_page(request):
            counted = authors.annotate(book_count=Count("books", distinct=True))
            return Response([_author_payload(author, brief=True) for author in counted])
        total = authors.count()
        start, end, number, pages = _bounds(request, total)
        page = authors.annotate(book_count=Count("books", distinct=True))[start:end]
        return _page_payload(
            [_author_payload(author, brief=True) for author in page],
            total,
            number,
            pages,
            _author_stats(),
        )

    def post(self, request):
        denied = _needs(request, "catalog.add_author")
        if denied:
            return denied
        name = str(request.data.get("name", "")).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        author = Author(name=name[:300], biography=str(request.data.get("biography", "")).strip())
        if request.FILES.get("photo"):
            author.photo = request.FILES["photo"]
        try:
            author.full_clean()
            author.save()
        except ValidationError:
            return _fail("La photo n'est pas acceptée.")
        record_staff_action(actor=request.user, action="auteur_ajout", target_type="catalog.Author", target_id=author.pk)
        return Response(_author_payload(author), status=201)


class AuthorDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, pk):
        denied = _needs(request, "catalog.view_author")
        if denied:
            return denied
        author = Author.objects.filter(pk=pk).first()
        if author is None:
            return _fail("Cet auteur n'existe pas.", 404)
        return Response(_author_payload(author))

    def patch(self, request, pk):
        denied = _needs(request, "catalog.change_author")
        if denied:
            return denied
        author = Author.objects.filter(pk=pk).first()
        if author is None:
            return _fail("Cet auteur n'existe pas.", 404)
        name = str(request.data.get("name", author.name)).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        author.name = name[:300]
        if "biography" in request.data:
            author.biography = str(request.data.get("biography", "")).strip()
        if request.FILES.get("photo"):
            author.photo = request.FILES["photo"]
        try:
            author.full_clean()
            author.save()
        except ValidationError:
            return _fail("La photo n'est pas acceptée.")
        record_staff_action(actor=request.user, action="auteur_modification", target_type="catalog.Author", target_id=author.pk)
        return Response(_author_payload(author))

    def delete(self, request, pk):
        denied = _needs(request, "catalog.delete_author")
        if denied:
            return denied
        author = Author.objects.filter(pk=pk).first()
        if author is None:
            return _fail("Cet auteur n'existe pas.", 404)
        if author.books.exists():
            return _fail("Cet auteur est lié à des livres.", 409)
        author_id = author.pk
        author.delete()
        record_staff_action(actor=request.user, action="auteur_suppression", target_type="catalog.Author", target_id=author_id)
        return Response(status=204)


class PublisherListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Lecture pour la liste admin, ou pour le sélecteur du formulaire livre.
        denied = _needs(request, "catalog.view_publisher")
        if denied and not request.user.has_perm("catalog.view_book") and not request.user.has_perm("catalog.add_book"):
            return denied
        publishers = _named_rows(request, Publisher.objects.all(), "notes")
        autocomplete = str(request.GET.get("autocomplete", "")).lower() in {"1", "true"}
        if autocomplete:
            total = publishers.count()
            start, end, number, pages = _bounds(request, total)
            page = list(publishers.values("id", "name")[start:end])
            return Response({"count": total, "page": number, "pages": pages, "results": page})
        if not _wants_page(request):
            counted = publishers.annotate(book_count=Count("books", distinct=True))
            return Response([_publisher_payload(item, brief=True) for item in counted])
        total = publishers.count()
        start, end, number, pages = _bounds(request, total)
        page = publishers.annotate(book_count=Count("books", distinct=True))[start:end]
        return _page_payload(
            [_publisher_payload(item, brief=True) for item in page],
            total,
            number,
            pages,
            _publisher_stats(),
        )

    def post(self, request):
        denied = _needs(request, "catalog.add_publisher")
        if denied:
            return denied
        name = str(request.data.get("name", "")).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        if Publisher.objects.filter(name__iexact=name).exists():
            return _fail("Cet éditeur existe déjà.")
        publisher = Publisher(name=name[:200], notes=str(request.data.get("notes", "")).strip())
        publisher.save()
        record_staff_action(
            actor=request.user,
            action="editeur_ajout",
            target_type="catalog.Publisher",
            target_id=publisher.pk,
        )
        return Response(_publisher_payload(publisher), status=201)


class PublisherDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        denied = _needs(request, "catalog.view_publisher")
        if denied:
            return denied
        publisher = Publisher.objects.filter(pk=pk).first()
        if publisher is None:
            return _fail("Cet éditeur n'existe pas.", 404)
        return Response(_publisher_payload(publisher))

    def patch(self, request, pk):
        denied = _needs(request, "catalog.change_publisher")
        if denied:
            return denied
        publisher = Publisher.objects.filter(pk=pk).first()
        if publisher is None:
            return _fail("Cet éditeur n'existe pas.", 404)
        name = str(request.data.get("name", publisher.name)).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        if Publisher.objects.filter(name__iexact=name).exclude(pk=publisher.pk).exists():
            return _fail("Cet éditeur existe déjà.")
        publisher.name = name[:200]
        if "notes" in request.data:
            publisher.notes = str(request.data.get("notes", "")).strip()
        publisher.save()
        record_staff_action(
            actor=request.user,
            action="editeur_modification",
            target_type="catalog.Publisher",
            target_id=publisher.pk,
        )
        return Response(_publisher_payload(publisher))

    def delete(self, request, pk):
        denied = _needs(request, "catalog.delete_publisher")
        if denied:
            return denied
        publisher = Publisher.objects.filter(pk=pk).first()
        if publisher is None:
            return _fail("Cet éditeur n'existe pas.", 404)
        if publisher.books.exists():
            return _fail("Cet éditeur est lié à des livres.", 409)
        publisher_id = publisher.pk
        publisher.delete()
        record_staff_action(
            actor=request.user,
            action="editeur_suppression",
            target_type="catalog.Publisher",
            target_id=publisher_id,
        )
        return Response(status=204)


class CategoryListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        denied = _needs(request, "catalog.view_category")
        if denied:
            return denied
        categories = _named_rows(request, _counted_categories(), "description", parent=True)
        if not _wants_page(request):
            return Response([_category_payload(item) for item in categories])
        total = categories.count()
        start, end, number, pages = _bounds(request, total)
        page = categories[start:end]
        return _page_payload(
            [_category_payload(item) for item in page],
            total,
            number,
            pages,
            _category_stats(),
        )

    def post(self, request):
        denied = _needs(request, "catalog.add_category")
        if denied:
            return denied
        name = str(request.data.get("name", "")).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        parent, error = _parent_choice(request.data)
        if error:
            return _fail(error)
        if Category.objects.filter(parent=parent, name__iexact=name).exists():
            return _fail("Cette catégorie existe déjà.")
        category = Category(name=name[:120], description=str(request.data.get("description", "")).strip(), parent=parent)
        category.save()
        record_staff_action(actor=request.user, action="categorie_ajout", target_type="catalog.Category", target_id=category.pk)
        return Response(_category_payload(category), status=201)


class CategoryDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        denied = _needs(request, "catalog.view_category")
        if denied:
            return denied
        category = Category.objects.filter(pk=pk).first()
        if category is None:
            return _fail("Cette catégorie n'existe pas.", 404)
        return Response(_category_payload(category))

    def patch(self, request, pk):
        denied = _needs(request, "catalog.change_category")
        if denied:
            return denied
        category = Category.objects.filter(pk=pk).first()
        if category is None:
            return _fail("Cette catégorie n'existe pas.", 404)
        name = str(request.data.get("name", category.name)).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        parent, error = _parent_choice(request.data, category)
        if error:
            return _fail(error)
        if Category.objects.filter(parent=parent, name__iexact=name).exclude(pk=category.pk).exists():
            return _fail("Cette catégorie existe déjà.")
        category.name = name[:120]
        category.parent = parent
        if "description" in request.data:
            category.description = str(request.data.get("description", "")).strip()
        category.save()
        record_staff_action(actor=request.user, action="categorie_modification", target_type="catalog.Category", target_id=category.pk)
        return Response(_category_payload(category))

    def delete(self, request, pk):
        denied = _needs(request, "catalog.delete_category")
        if denied:
            return denied
        category = Category.objects.filter(pk=pk).first()
        if category is None:
            return _fail("Cette catégorie n'existe pas.", 404)
        category_id = category.pk
        try:
            category.delete()
        except ProtectedError:
            return _fail("Cette catégorie est utilisée par des livres.", 409)
        record_staff_action(actor=request.user, action="categorie_suppression", target_type="catalog.Category", target_id=category_id)
        return Response(status=204)


def _wants_page(request):
    return any(request.GET.get(key) for key in ("page", "page_size", "q", "tri"))


def _bounds(request, total):
    try:
        page = max(1, int(request.GET.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(100, max(1, int(request.GET.get("page_size", 20))))
    except (TypeError, ValueError):
        page_size = 20
    pages = max(1, (total + page_size - 1) // page_size)
    page = min(page, pages)
    start = (page - 1) * page_size
    return start, start + page_size, page, pages


def _page_payload(results, total, page, pages, stats, extra=None):
    payload = {"count": total, "page": page, "pages": pages, "results": results, "stats": stats}
    if extra:
        payload.update(extra)
    return Response(payload)


def _named_rows(request, queryset, text_field, parent=False):
    query = str(request.GET.get("q", "")).strip()
    tokens = [part for part in query.split() if part]
    for token in tokens:
        lookup = Q(name__icontains=token) | Q(**{f"{text_field}__icontains": token})
        if parent:
            lookup |= Q(parent__name__icontains=token)
        queryset = queryset.filter(lookup)
    order = "-name" if request.GET.get("tri") == "za" else "name"
    return queryset.order_by(order, "pk")


def _counted_categories():
    direct = (
        Book.objects.filter(category_id=OuterRef("pk"))
        .order_by()
        .values("category_id")
        .annotate(total=Count("pk"))
        .values("total")
    )
    nested = (
        Book.objects.filter(category__parent_id=OuterRef("pk"))
        .order_by()
        .values("category__parent_id")
        .annotate(total=Count("pk"))
        .values("total")
    )
    zero = Value(0, output_field=IntegerField())
    return Category.objects.select_related("parent").annotate(
        book_count=Coalesce(Subquery(direct[:1], output_field=IntegerField()), zero)
        + Coalesce(Subquery(nested[:1], output_field=IntegerField()), zero)
    )


def _author_stats():
    total = Author.objects.count()
    with_books = Author.objects.filter(books__isnull=False).distinct().count()
    return {
        "total": total,
        "with_books": with_books,
        "without_books": total - with_books,
        "linked": Book.authors.through.objects.count(),
    }


def _publisher_stats():
    total = Publisher.objects.count()
    with_books = Publisher.objects.filter(books__isnull=False).distinct().count()
    return {
        "total": total,
        "with_books": with_books,
        "without_books": total - with_books,
        "linked": Book.objects.exclude(publisher_id=None).count(),
    }


def _category_stats():
    total = Category.objects.count()
    used = set(Book.objects.values_list("category_id", flat=True).distinct())
    parents = set(Category.objects.filter(pk__in=used, parent_id__isnull=False).values_list("parent_id", flat=True))
    with_books = len(used | parents)
    return {
        "total": total,
        "with_books": with_books,
        "without_books": total - with_books,
        "classified": Book.objects.count(),
    }


def _book_stats():
    available = Copy.objects.filter(status=CopyStatus.AVAILABLE).count()
    copies = Copy.objects.count()
    return {
        "books": Book.objects.count(),
        "available": available,
        "unavailable": copies - available,
        "copies": copies,
    }


def _page(request, queryset):
    total = queryset.count()
    start, end, page, pages = _bounds(request, total)
    return queryset[start:end], total, page, pages


def _staff_books(request):
    books = Book.objects.all()
    query = str(request.GET.get("q", "")).strip()
    if query:
        books = filter_books(books, query)
    category = str(request.GET.get("categorie", "")).strip()
    if category.isdigit():
        selected = Category.objects.filter(pk=int(category))
    elif category:
        selected = Category.objects.filter(slug=category)
    else:
        selected = None
    if selected is not None:
        ids = list(selected.values_list("pk", flat=True))
        ids.extend(Category.objects.filter(parent_id__in=ids).values_list("pk", flat=True))
        books = books.filter(category_id__in=ids)
    language = str(request.GET.get("langue", "")).strip()
    if language:
        books = books.filter(language=language)
    state = str(request.GET.get("etat", "")).strip()
    if state in dict(BookState.choices):
        books = books.filter(state=state)
    availability = str(request.GET.get("disponibilite", "")).strip()
    available_copy = Copy.objects.filter(book_id=OuterRef("pk"), status=CopyStatus.AVAILABLE)
    if availability == "disponible":
        books = books.filter(Exists(available_copy))
    elif availability == "indisponible":
        books = books.filter(~Exists(available_copy))
    archive = str(request.GET.get("archivage", "")).strip()
    if archive == "archives":
        books = books.filter(state=BookState.ARCHIVED)
    elif archive == "actifs":
        books = books.exclude(state=BookState.ARCHIVED)
    order = "-title" if request.GET.get("tri") == "za" else "title"
    return books.order_by(order, "pk")


class BookListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "catalog.view_book")
        if denied:
            return denied
        books = _staff_books(request)
        total = books.count()
        start, end, number, pages = _bounds(request, total)
        page = (
            books.select_related("category", "category__parent", "cover_image", "publisher")
            .prefetch_related("authors")
            .with_copy_counts()[start:end]
        )
        choices = [
            {"id": item.pk, "label": _category_label(item)}
            for item in Category.objects.select_related("parent").order_by("name")
        ]
        return _page_payload(
            [_book_list_payload(book) for book in page],
            total,
            number,
            pages,
            _book_stats(),
            {"categories": choices},
        )

    def post(self, request):
        denied = _needs(request, "catalog.add_book")
        if denied:
            return denied
        book = Book()
        try:
            with transaction.atomic():
                error = _apply_book(book, request.data, request.FILES.get("cover"), creating=True, user=request.user)
                if error:
                    transaction.set_rollback(True)
                    return _fail(error)
        except IntegrityError as exc:
            message = "Cet ISBN est déjà utilisé." if "isbn" in str(exc).lower() else "Ce numéro d'inventaire est déjà utilisé."
            return _fail(message)
        record_staff_action(actor=request.user, action="livre_ajout", target_type="catalog.Book", target_id=book.pk)
        return Response(_book_detail(book), status=201)


class BookDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request, pk):
        denied = _needs(request, "catalog.view_book")
        if denied:
            return denied
        book = (
            Book.objects.filter(pk=pk)
            .select_related("category", "category__parent", "cover_image", "publisher")
            .prefetch_related("authors", "copies", "copies__register_row", "keywords")
            .first()
        )
        if book is None:
            return _fail("Ce livre n'existe pas.", 404)
        return Response(_book_detail(book))

    def patch(self, request, pk):
        denied = _needs(request, "catalog.change_book")
        if denied:
            return denied
        book = Book.objects.filter(pk=pk).first()
        if book is None:
            return _fail("Ce livre n'existe pas.", 404)
        keys = set(request.data.keys())
        if not request.FILES and keys <= {"state", "archived", "published"}:
            state = str(request.data.get("state", "")).strip()
            if state not in dict(BookState.choices):
                if str(request.data.get("archived", "")).lower() in {"true", "1"}:
                    state = BookState.ARCHIVED
                elif str(request.data.get("published", "")).lower() in {"true", "1"}:
                    state = BookState.PUBLISHED
                elif "published" in request.data:
                    state = BookState.DRAFT
            if state not in dict(BookState.choices):
                return _fail("L'état du livre n'est pas reconnu.")
            book.state = state
            book.save(update_fields=["state", "updated_at"])
            action = {
                BookState.PUBLISHED: "livre_publication",
                BookState.DRAFT: "livre_depublication",
                BookState.ARCHIVED: "livre_archivage",
            }[state]
            record_staff_action(actor=request.user, action=action, target_type="catalog.Book", target_id=book.pk)
            return Response(_book_detail(book))
        try:
            with transaction.atomic():
                error = _apply_book(
                    book,
                    request.data,
                    request.FILES.get("cover"),
                    creating=False,
                    user=request.user,
                )
                if error:
                    transaction.set_rollback(True)
                    return _fail(error)
        except IntegrityError as exc:
            message = "Cet ISBN est déjà utilisé." if "isbn" in str(exc).lower() else "Ce numéro d'inventaire est déjà utilisé."
            return _fail(message)
        record_staff_action(actor=request.user, action="livre_modification", target_type="catalog.Book", target_id=book.pk)
        return Response(_book_detail(book))


def _copy_from_data(copy, data):
    call_number = str(data.get("call_number", copy.call_number if copy.pk else "")).strip()
    section = str(data.get("section", copy.section if copy.pk else "")).strip()
    shelf = str(data.get("shelf", copy.shelf if copy.pk else "")).strip()
    place = str(data.get("place", "")).strip()
    if place:
        section, shelf = _split_place(place)
    status = str(data.get("status", copy.status if copy.pk else "")).strip()
    status = LABEL_TO_STATUS.get(status, status)
    if not call_number:
        return "Chaque exemplaire a besoin d'une cote."
    if status not in STATUS_LABELS:
        return "Le statut d'un exemplaire n'est pas reconnu."
    acquired = data.get("acquired_on", copy.acquired_on if copy.pk else None)
    if acquired in ("", None):
        acquired = None
    else:
        acquired = str(acquired)[:10]
    inventory = str(data.get("inventory_number", copy.inventory_number if copy.pk else "") or "").strip()
    copy.call_number = call_number[:80]
    copy.inventory_number = inventory or None
    copy.fonds = str(data.get("fonds", copy.fonds if copy.pk else "")).strip()[:32]
    copy.secondary_call_number = str(
        data.get("secondary_call_number", copy.secondary_call_number if copy.pk else "")
    ).strip()[:40]
    if "price" in data:
        copy.acquisition_price = _parse_price(data.get("price"))
    copy.section = section[:80]
    copy.shelf = "" if shelf in ("", "-") else shelf[:80]
    copy.status = status
    copy.acquired_on = acquired
    try:
        copy.full_clean()
        copy.save()
    except ValidationError:
        return "La date d'acquisition n'est pas valide."
    return ""


class BookStateView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    target_state = BookState.DRAFT
    audit_action = "livre_modification"

    def post(self, request, pk):
        denied = _needs(request, "catalog.change_book")
        if denied:
            return denied
        book = Book.objects.filter(pk=pk).first()
        if book is None:
            return _fail("Ce livre n'existe pas.", 404)
        book.state = self.target_state
        book.save(update_fields=["state", "updated_at"])
        record_staff_action(actor=request.user, action=self.audit_action, target_type="catalog.Book", target_id=book.pk)
        return Response(_book_detail(book))


class BookPublishView(BookStateView):
    target_state = BookState.PUBLISHED
    audit_action = "livre_publication"


class BookUnpublishView(BookStateView):
    target_state = BookState.DRAFT
    audit_action = "livre_depublication"


class BookArchiveView(BookStateView):
    target_state = BookState.ARCHIVED
    audit_action = "livre_archivage"


class CopyListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        denied = _needs(request, "catalog.add_copy")
        if denied:
            return denied
        book = Book.objects.filter(pk=pk).first()
        if book is None:
            return _fail("Ce livre n'existe pas.", 404)
        copy = Copy(book=book)
        try:
            error = _copy_from_data(copy, request.data)
        except IntegrityError:
            return _fail("Ce numéro d'inventaire est déjà utilisé.")
        if error:
            return _fail(error)
        record_staff_action(actor=request.user, action="exemplaire_ajout", target_type="catalog.Copy", target_id=copy.pk)
        return Response(_copy_payload(copy), status=201)


class CopyDetailView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, copy_pk):
        denied = _needs(request, "catalog.change_copy")
        if denied:
            return denied
        copy = Copy.objects.filter(pk=copy_pk, book_id=pk).first()
        if copy is None:
            return _fail("Cet exemplaire n'existe pas.", 404)
        try:
            error = _copy_from_data(copy, request.data)
        except IntegrityError:
            return _fail("Ce numéro d'inventaire est déjà utilisé.")
        if error:
            return _fail(error)
        record_staff_action(actor=request.user, action="exemplaire_modification", target_type="catalog.Copy", target_id=copy.pk)
        return Response(_copy_payload(copy))

    def delete(self, request, pk, copy_pk):
        denied = _needs(request, "catalog.delete_copy")
        if denied:
            return denied
        copy = Copy.objects.filter(pk=copy_pk, book_id=pk).first()
        if copy is None:
            return _fail("Cet exemplaire n'existe pas.", 404)
        copy_id = copy.pk
        copy.delete()
        record_staff_action(actor=request.user, action="exemplaire_retrait", target_type="catalog.Copy", target_id=copy_id)
        return Response(status=204)
