"""Catalogue du personnel. Le serveur décide, le navigateur n'enregistre rien."""

import json

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import record_staff_action
from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.common.slugs import unique_slug

from .models import Author, Book, BookLanguage, Category, Copy, CopyStatus

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
    return text[:80], "-"


def _copy_payload(copy):
    return {
        "id": copy.pk,
        "call_number": copy.call_number,
        "place": _place(copy.section, copy.shelf),
        "status": STATUS_LABELS.get(copy.status, copy.status),
    }


def _book_status(book):
    if book.archived:
        return "Archivé"
    if not book.published:
        return "Brouillon"
    return "Publié"


def _book_list_payload(book):
    available = book.copies.filter(status=CopyStatus.AVAILABLE).count()
    total = book.copies.count()
    names = [author.name for author in book.authors.all()]
    return {
        "id": book.pk,
        "title": book.title,
        "summary": book.summary,
        "authors": ", ".join(names),
        "author_ids": [author.pk for author in book.authors.all()],
        "category": book.category.name,
        "category_id": book.category_id,
        "isbn": book.isbn,
        "year": str(book.publication_year),
        "available": available,
        "unavailable": total - available,
        "status": _book_status(book),
        "cover": _media(book.cover),
    }


def _book_detail(book):
    payload = _book_list_payload(book)
    payload.update(
        {
            "publisher": book.publisher,
            "language": book.language,
            "pages": book.page_count or "",
            "keywords": book.keywords or [],
            "archived": book.archived,
            "published": book.published,
            "copies": [_copy_payload(copy) for copy in book.copies.all()],
        }
    )
    return payload


def _author_payload(author):
    return {
        "id": author.pk,
        "name": author.name,
        "biography": author.biography,
        "photo": _media(author.photo),
        "books": author.books.count(),
    }


def _category_payload(category):
    return {
        "id": category.pk,
        "name": category.name,
        "description": category.description,
        "books": category.books.count(),
    }


def _store_copies(book, raw_copies):
    copies = _json_list(raw_copies)
    if copies is None:
        return "Les exemplaires sont illisibles."
    seen = set()
    prepared = []
    for item in copies:
        if not isinstance(item, dict):
            return "Un exemplaire est incomplet."
        call_number = str(item.get("call_number", "")).strip()
        place = str(item.get("place", "")).strip()
        status = str(item.get("status", "")).strip()
        status = LABEL_TO_STATUS.get(status, status)
        if not call_number or not place:
            return "Chaque exemplaire a besoin d'une cote et d'un emplacement."
        if status not in STATUS_LABELS:
            return "Le statut d'un exemplaire n'est pas reconnu."
        if call_number in seen:
            return "Cette cote est déjà utilisée."
        seen.add(call_number)
        section, shelf = _split_place(place)
        prepared.append((call_number[:50], section, shelf, status))
    book.copies.all().delete()
    for call_number, section, shelf, status in prepared:
        Copy.objects.create(
            book=book,
            call_number=call_number,
            section=section or "-",
            shelf=shelf or "-",
            status=status,
        )
    return ""


def _apply_book(book, data, cover, *, creating):
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
        return "Les mots-clés sont illisibles."
    keywords = [str(word).strip()[:40] for word in keywords if str(word).strip()][:20]
    try:
        year_number = int(year)
    except (TypeError, ValueError):
        return "L'année de publication doit être comprise entre 1000 et 2100."
    if year_number < 1000 or year_number > 2100:
        return "L'année de publication doit être comprise entre 1000 et 2100."
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
    if creating and not cover:
        return "La couverture est obligatoire."
    published = str(data.get("published", "true")).lower() not in {"false", "0"}
    archived = str(data.get("archived", "false")).lower() in {"true", "1"}
    book.title = title[:255]
    book.category = category
    book.publication_year = year_number
    book.summary = summary
    book.language = language
    book.publisher = str(data.get("publisher", "")).strip()[:200]
    book.isbn = str(data.get("isbn", "")).strip()[:20]
    book.page_count = page_count
    book.keywords = keywords
    book.published = published
    book.archived = archived
    if not book.summary:
        return "Le résumé est obligatoire."
    if cover:
        book.cover = cover
    if not book.slug:
        book.slug = unique_slug(Book, book.title, max_length=255, instance=book)
    try:
        book.full_clean()
        book.save()
    except ValidationError as exc:
        return exc.messages[0] if exc.messages else "La couverture n'est pas acceptée."
    book.authors.set(authors)
    copy_error = _store_copies(book, data.get("copies", "[]"))
    if copy_error:
        return copy_error
    return ""


class AuthorListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "catalog.view_author")
        if denied:
            return denied
        authors = Author.objects.order_by("name")
        return Response([_author_payload(author) for author in authors])

    def post(self, request):
        denied = _needs(request, "catalog.add_author")
        if denied:
            return denied
        name = str(request.data.get("name", "")).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        author = Author(name=name[:200], biography=str(request.data.get("biography", "")).strip())
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
        author.name = name[:200]
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


class CategoryListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        denied = _needs(request, "catalog.view_category")
        if denied:
            return denied
        return Response([_category_payload(item) for item in Category.objects.order_by("name")])

    def post(self, request):
        denied = _needs(request, "catalog.add_category")
        if denied:
            return denied
        name = str(request.data.get("name", "")).strip()
        if not name:
            return _fail("Le nom est obligatoire.")
        if Category.objects.filter(name__iexact=name).exists():
            return _fail("Cette catégorie existe déjà.")
        category = Category(name=name[:120], description=str(request.data.get("description", "")).strip())
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
        if Category.objects.filter(name__iexact=name).exclude(pk=category.pk).exists():
            return _fail("Cette catégorie existe déjà.")
        category.name = name[:120]
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


class BookListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get(self, request):
        denied = _needs(request, "catalog.view_book")
        if denied:
            return denied
        books = Book.objects.select_related("category").prefetch_related("authors", "copies")
        return Response([_book_list_payload(book) for book in books])

    def post(self, request):
        denied = _needs(request, "catalog.add_book")
        if denied:
            return denied
        book = Book()
        try:
            with transaction.atomic():
                error = _apply_book(book, request.data, request.FILES.get("cover"), creating=True)
                if error:
                    transaction.set_rollback(True)
                    return _fail(error)
        except IntegrityError:
            return _fail("Cette cote est déjà utilisée.")
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
        book = Book.objects.filter(pk=pk).select_related("category").prefetch_related("authors", "copies").first()
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
        if not request.FILES and keys <= {"archived", "published"}:
            if "archived" in request.data:
                book.archived = str(request.data.get("archived")).lower() in {"true", "1"}
            if "published" in request.data:
                book.published = str(request.data.get("published")).lower() not in {"false", "0"}
            book.save(update_fields=["archived", "published", "updated_at"])
            record_staff_action(actor=request.user, action="livre_modification", target_type="catalog.Book", target_id=book.pk)
            return Response(_book_detail(book))
        try:
            with transaction.atomic():
                error = _apply_book(book, request.data, request.FILES.get("cover"), creating=False)
                if error:
                    transaction.set_rollback(True)
                    return _fail(error)
        except IntegrityError:
            return _fail("Cette cote est déjà utilisée.")
        record_staff_action(actor=request.user, action="livre_modification", target_type="catalog.Book", target_id=book.pk)
        return Response(_book_detail(book))
