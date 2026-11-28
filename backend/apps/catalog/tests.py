import tempfile
from io import BytesIO
from pathlib import Path

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from django.db import IntegrityError, connection, transaction
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.roles import ROLE_EDITOR, ROLE_LIBRARIAN, sync_roles
from apps.catalog.models import (
    Author,
    Book,
    BookCannotBeDeleted,
    BookState,
    Category,
    Copy,
    CopyStatus,
    Publisher,
    RegisterRow,
    StoredImage,
)
from apps.catalog.publishers import sync_publishers
from apps.catalog.validators import validate_catalog_image

TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="totanga-catalog-tests-")


def image_upload(name, image_format):
    buffer = BytesIO()
    Image.new("RGB", (4, 4), (12, 80, 60)).save(buffer, format=image_format)
    return SimpleUploadedFile(name, buffer.getvalue())


class CatalogImageValidatorTests(SimpleTestCase):
    def test_accepts_jpeg_png_and_webp(self):
        samples = (
            ("couverture.jpg", "JPEG"),
            ("couverture.png", "PNG"),
            ("couverture.webp", "WEBP"),
        )
        for name, image_format in samples:
            validate_catalog_image(image_upload(name, image_format))

    def test_rejects_a_document_renamed_as_image(self):
        upload = SimpleUploadedFile("roman.jpg", b"%PDF-1.4 ce n'est pas une image")
        with self.assertRaises(ValidationError):
            validate_catalog_image(upload)

    def test_rejects_a_file_over_five_megabytes(self):
        upload = SimpleUploadedFile("couverture.jpg", b"x" * (5 * 1024 * 1024 + 1))
        with self.assertRaisesMessage(ValidationError, "5 Mo"):
            validate_catalog_image(upload)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class BookCatalogTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Roman africain")
        self.author = Author.objects.create(name="Sony Labou Tansi")

    def make_book(self, **overrides):
        author = overrides.pop("author", self.author)
        archived = overrides.pop("archived", False)
        cover = overrides.pop("cover", image_upload("couverture.jpg", "JPEG"))
        values = {
            "title": "La Vie et demie",
            "category": self.category,
            "publication_year": 1979,
            "summary": "Un roman.",
            "state": BookState.ARCHIVED if archived else BookState.PUBLISHED,
        }
        values.update(overrides)
        if cover is not None:
            image = StoredImage(alt_text=values["title"][:200], size=cover.size, uploaded_by=None)
            image.file.save(cover.name, cover, save=True)
            values["cover_image"] = image
        book = Book.objects.create(**values)
        book.authors.add(author)
        return book

    def test_category_slug_comes_from_the_name(self):
        self.assertEqual(self.category.slug, "roman-africain")

    def test_book_with_an_available_copy_is_available(self):
        book = self.make_book()
        Copy.objects.create(
            book=book,
            call_number="RA-001",
            section="Romans",
            shelf="A1",
            status=CopyStatus.AVAILABLE,
        )
        Copy.objects.create(
            book=book,
            call_number="RA-002",
            section="Romans",
            shelf="A1",
            status=CopyStatus.BORROWED,
        )

        self.assertTrue(book.is_available)
        self.assertEqual(book.copy_count, 2)
        self.assertEqual(book.available_copy_count, 1)
        self.assertEqual(Book.objects.available().get(), book)

        listed = Book.objects.with_copy_counts().get(pk=book.pk)
        self.assertEqual(listed.copy_count, 2)
        self.assertEqual(listed.available_copy_count, 1)
        self.assertTrue(listed.is_available)

    def test_book_without_an_available_copy_is_not_available(self):
        book = self.make_book()
        Copy.objects.create(
            book=book,
            call_number="RA-003",
            section="Romans",
            shelf="A2",
            status=CopyStatus.BORROWED,
        )

        self.assertFalse(book.is_available)
        self.assertEqual(book.copy_count, 1)
        self.assertEqual(book.available_copy_count, 0)

    def test_archived_book_cannot_be_deleted(self):
        book = self.make_book(archived=True)

        with self.assertRaises(BookCannotBeDeleted):
            book.delete()
        with self.assertRaises(BookCannotBeDeleted):
            Book.objects.filter(pk=book.pk).delete()

        self.assertTrue(Book.objects.filter(pk=book.pk).exists())

    def test_admin_archives_and_does_not_offer_deletion(self):
        User.objects.create_superuser(
            "bibliothecaire",
            "biblio@totanga.cd",
            "Bibliotheque-2026",
        )
        self.client.login(username="bibliothecaire", password="Bibliotheque-2026")
        book = self.make_book()
        Copy.objects.create(
            book=book,
            call_number="RA-010",
            section="Romans",
            shelf="A1",
            status=CopyStatus.AVAILABLE,
        )

        change_url = reverse("admin:catalog_book_change", args=[book.pk])
        change_page = self.client.get(change_url)
        self.assertNotContains(
            change_page,
            reverse("admin:catalog_book_delete", args=[book.pk]),
        )
        self.assertContains(change_page, "RA-010")

        list_url = reverse("admin:catalog_book_changelist")
        found = self.client.get(list_url, {"q": "RA-010"})
        self.assertEqual(list(found.context["cl"].queryset), [book])

        self.client.post(
            list_url,
            {"action": "archive_books", "_selected_action": [str(book.pk)]},
        )
        book.refresh_from_db()
        self.assertEqual(book.state, BookState.ARCHIVED)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class StaffCatalogApiTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.librarian = self.person("biblio-catalogue", ROLE_LIBRARIAN)
        self.editor = self.person("redacteur-catalogue", ROLE_EDITOR)
        self.category = Category.objects.create(name="Roman africain")
        self.author = Author.objects.create(name="Sony Labou Tansi")

    def person(self, username, role):
        user = User.objects.create_user(username, password="MotDePasse-Personnel-2026")
        user.groups.add(Group.objects.get(name=role))
        return user

    def token(self):
        response = self.client.get("/api/gestion/session/")
        self.assertIn(response.status_code, (200, 204))
        return response.cookies["csrftoken"].value

    def login(self, user):
        return self.client.post(
            "/api/gestion/session/",
            {"username": user.username, "password": "MotDePasse-Personnel-2026"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )

    def test_editor_cannot_list_books(self):
        self.login(self.editor)
        response = self.client.get("/api/gestion/catalogue/livres/")
        self.assertEqual(response.status_code, 403)

    def test_librarian_saves_publishes_and_cannot_delete_a_book(self):
        self.login(self.librarian)
        created = self.client.post(
            "/api/gestion/catalogue/livres/",
            {
                "title": "La Vie et demie",
                "summary": "Un roman.",
                "category_id": self.category.pk,
                "author_ids": f"[{self.author.pk}]",
                "year": "1979",
                "language": "fr",
                "published": "false",
                "archived": "false",
                "keywords": '["roman"]',
                "pages": "220",
                "copies": '[{"call_number":"RA-900","place":"Romans – A1","status":"Disponible"}]',
                "cover": image_upload("couverture.jpg", "JPEG"),
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(created.json()["status"], "Brouillon")
        book_id = created.json()["id"]
        published = self.client.patch(
            f"/api/gestion/catalogue/livres/{book_id}/",
            {"published": True},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(published.status_code, 200)
        self.assertEqual(published.json()["status"], "Publié")
        removed = self.client.delete(
            f"/api/gestion/catalogue/livres/{book_id}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(removed.status_code, 405)
        self.assertTrue(Book.objects.filter(pk=book_id).exists())

    def test_librarian_can_remove_book_cover(self):
        self.login(self.librarian)
        created = self.client.post(
            "/api/gestion/catalogue/livres/",
            {
                "title": "Sans couverture bientôt",
                "summary": "Un roman.",
                "category_id": self.category.pk,
                "author_ids": f"[{self.author.pk}]",
                "year": "2001",
                "language": "fr",
                "state": "published",
                "keywords": "[]",
                "copies": "[]",
                "cover": image_upload("couverture.jpg", "JPEG"),
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertTrue(created.json()["cover"])
        book_id = created.json()["id"]
        cleared = self.client.patch(
            f"/api/gestion/catalogue/livres/{book_id}/",
            {
                "title": "Sans couverture bientôt",
                "summary": "Un roman.",
                "category_id": self.category.pk,
                "author_ids": f"[{self.author.pk}]",
                "year": "2001",
                "language": "fr",
                "state": "published",
                "keywords": "[]",
                "copies": "[]",
                "remove_cover": "true",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(cleared.status_code, 200, cleared.content)
        self.assertEqual(cleared.json()["cover"], "")
        self.assertIsNone(Book.objects.get(pk=book_id).cover_image_id)

    def test_category_used_by_a_book_is_kept(self):
        self.login(self.librarian)
        book = Book.objects.create(
            title="Verre cassé",
            category=self.category,
            publication_year=2005,
            summary="Un roman.",
            state=BookState.PUBLISHED,
        )
        book.authors.add(self.author)
        response = self.client.delete(
            f"/api/gestion/catalogue/categories/{self.category.pk}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 409)
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())

    def test_editor_cannot_publish_a_book(self):
        self.login(self.editor)
        book = Book.objects.create(
            title="Brouillon du rédacteur",
            category=self.category,
            state=BookState.DRAFT,
        )
        book.authors.add(self.author)
        response = self.client.post(
            f"/api/gestion/catalogue/livres/{book.pk}/publier/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 403)
        book.refresh_from_db()
        self.assertEqual(book.state, BookState.DRAFT)

    def test_lists_return_one_page_and_keep_the_full_choice_lists(self):
        self.login(self.librarian)
        Book.objects.create(title="Premier titre", category=self.category, state=BookState.PUBLISHED, summary="Un resume long")
        Book.objects.create(title="Second titre", category=self.category, state=BookState.DRAFT)
        Author.objects.create(name="Autre Auteur")

        books = self.client.get("/api/gestion/catalogue/livres/?page=1&page_size=1")
        self.assertEqual(books.status_code, 200)
        body = books.json()
        self.assertEqual(len(body["results"]), 1)
        self.assertGreaterEqual(body["count"], 2)
        self.assertNotIn("summary", body["results"][0])
        self.assertNotIn("author_ids", body["results"][0])
        self.assertGreaterEqual(body["stats"]["books"], 2)
        self.assertEqual(body["categories"][0]["label"], "Roman africain")

        drafts = self.client.get("/api/gestion/catalogue/livres/?etat=draft&page_size=50")
        self.assertIn("Second titre", [item["title"] for item in drafts.json()["results"]])
        self.assertNotIn("Premier titre", [item["title"] for item in drafts.json()["results"]])

        authors = self.client.get("/api/gestion/catalogue/auteurs/?page=1&page_size=1")
        self.assertEqual(len(authors.json()["results"]), 1)
        self.assertGreaterEqual(authors.json()["count"], 2)
        self.assertIn("total", authors.json()["stats"])
        self.assertIsInstance(self.client.get("/api/gestion/catalogue/auteurs/").json(), list)

        categories = self.client.get("/api/gestion/catalogue/categories/?page=1&page_size=1&q=Roman")
        self.assertEqual(categories.status_code, 200)
        self.assertEqual(categories.json()["results"][0]["name"], "Roman africain")
        self.assertGreaterEqual(categories.json()["results"][0]["books"], 2)
        self.assertIsInstance(self.client.get("/api/gestion/catalogue/categories/").json(), list)

        Publisher.objects.create(name="Presence Africaine")
        publishers = self.client.get("/api/gestion/catalogue/editeurs/?page=1&page_size=1&q=Presence")
        self.assertEqual(publishers.status_code, 200)
        self.assertEqual(publishers.json()["results"][0]["name"], "Presence Africaine")
        self.assertIsInstance(self.client.get("/api/gestion/catalogue/editeurs/").json(), list)
        auto = self.client.get("/api/gestion/catalogue/editeurs/?autocomplete=1&page=1&page_size=5&q=Presence")
        self.assertEqual(auto.status_code, 200)
        self.assertEqual(auto.json()["results"][0], {"id": publishers.json()["results"][0]["id"], "name": "Presence Africaine"})

    def test_book_form_uses_publisher_autocomplete_choice(self):
        self.login(self.librarian)
        publisher = Publisher.objects.create(name="Seuil")
        created = self.client.post(
            "/api/gestion/catalogue/livres/",
            {
                "title": "Livre avec editeur",
                "category_id": self.category.pk,
                "author_ids": f"[{self.author.pk}]",
                "publisher_id": str(publisher.pk),
                "published": "false",
                "copies": "[]",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        body = created.json()
        self.assertEqual(body["publisher"], "Seuil")
        self.assertEqual(body["publisher_id"], publisher.pk)
        self.assertEqual(body["publisher_choice"]["name"], "Seuil")
        blocked = self.client.delete(
            f"/api/gestion/catalogue/editeurs/{publisher.pk}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(blocked.status_code, 409)

    def test_sync_publishers_is_idempotent(self):
        RegisterRow.objects.create(
            source_line=9001,
            publisher="  Maison Totanga  ",
            title="Exemple",
        )
        # Fichier absent : ne lit que le registre, pas le CSV monte.
        absent = Path("/tmp/totanga-absent-repertoire.csv")
        first = sync_publishers(absent)
        second = sync_publishers(absent)
        self.assertEqual(first["created"], 1)
        self.assertEqual(first["linked"], 0)
        self.assertEqual(second["created"], 0)
        self.assertEqual(second["linked"], 0)
        self.assertEqual(Publisher.objects.filter(name__iexact="Maison Totanga").count(), 1)

    def test_sync_publishers_links_book_from_register_editeur(self):
        book = Book.objects.create(
            title="Sans editeur",
            category=self.category,
            state=BookState.PUBLISHED,
        )
        book.authors.add(self.author)
        copy = Copy.objects.create(
            book=book,
            call_number="100 A",
            inventory_number="LINK-1",
            status=CopyStatus.AVAILABLE,
        )
        RegisterRow.objects.create(
            source_line=9101,
            publisher="Editions Totanga",
            title=book.title,
            inventory_number=copy.inventory_number,
            copy=copy,
            status="importée",
        )
        Book.objects.filter(pk=book.pk).update(imported_at=book.updated_at)
        result = sync_publishers(Path("/tmp/totanga-absent-repertoire.csv"))
        book.refresh_from_db()
        self.assertGreaterEqual(result["linked"], 1)
        self.assertEqual(book.publisher.name, "Editions Totanga")

    def test_saved_book_keeps_the_lengths_and_copy_fields_of_the_database(self):
        self.login(self.librarian)
        title = "T" * 300
        created = self.client.post(
            "/api/gestion/catalogue/livres/",
            {
                "title": title,
                "category_id": self.category.pk,
                "author_ids": f"[{self.author.pk}]",
                "keywords": '["mot-cle-de-notice"]',
                "published": "false",
                "copies": '[{"call_number":"301 FOU","section":"Romans","shelf":"A1","status":"Disponible","inventory_number":"NE-FORM-1"}]',
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        body = created.json()
        self.assertEqual(body["title"], title)
        self.assertEqual(body["author_choices"][0]["name"], self.author.name)
        self.assertEqual(body["keywords"], ["mot-cle-de-notice"])
        self.assertEqual(body["copies"][0]["section"], "Romans")
        self.assertEqual(body["copies"][0]["shelf"], "A1")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class CatalogConstraintTests(BookCatalogTests):
    def test_database_refuses_a_direct_book_delete(self):
        book = self.make_book()
        with self.assertRaises(Exception):
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM catalog_book WHERE id = %s", [book.pk])
        self.assertTrue(Book.objects.filter(pk=book.pk).exists())

    def test_database_refuses_to_delete_a_linked_author(self):
        self.make_book()
        with self.assertRaises(Exception):
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute("DELETE FROM catalog_author WHERE id = %s", [self.author.pk])
        self.assertTrue(Author.objects.filter(pk=self.author.pk).exists())

    def test_empty_isbns_repeat_and_a_filled_isbn_does_not(self):
        self.make_book(title="Sans un", isbn=None)
        self.make_book(title="Sans deux", isbn="")
        self.assertEqual(Book.objects.filter(isbn__isnull=True).count(), 2)
        self.make_book(title="Avec isbn", isbn="978-2-07-036822-8")
        self.assertEqual(Book.objects.get(title="Avec isbn").isbn, "9782070368228")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_book(title="Doublon", isbn="9782070368228")

    def test_year_is_optional_and_rejected_outside_the_range(self):
        self.make_book(title="Sans année", publication_year=None)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_book(title="Trop tôt", publication_year=999)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class PublicCatalogApiTests(BookCatalogTests):
    def setUp(self):
        super().setUp()
        self.api = APIClient()

    def test_public_catalog_shows_only_published_books(self):
        published = self.make_book(title="Roman public")
        Copy.objects.create(
            book=published,
            call_number="PUB-1",
            section="Romans",
            shelf="A1",
            status=CopyStatus.AVAILABLE,
        )
        self.make_book(title="Brouillon secret", state=BookState.DRAFT)
        self.make_book(title="Archivé secret", state=BookState.ARCHIVED)
        listing = self.api.get("/api/catalogue/livres/")
        self.assertEqual(listing.status_code, 200)
        body = listing.content.decode()
        self.assertIn("Roman public", body)
        self.assertNotIn("Brouillon secret", body)
        self.assertNotIn("Archivé secret", body)
        self.assertNotIn("email", body)
        self.assertEqual(listing.json()["count"], 1)
        hidden = self.api.get("/api/catalogue/livres/brouillon-secret/")
        self.assertEqual(hidden.status_code, 404)
        shown = self.api.get(f"/api/catalogue/livres/{published.slug}/")
        self.assertEqual(shown.status_code, 200)
        self.assertTrue(shown.json()["available"])
        self.assertNotIn("email", shown.json())
        self.assertEqual(shown.json()["copies"][0]["status"], "available")

    def test_search_ignores_accents(self):
        self.make_book(title="L'Été au village")
        found = self.api.get("/api/catalogue/livres/", {"q": "ete"})
        self.assertEqual(found.status_code, 200)
        self.assertEqual(found.json()["count"], 1)

    def test_search_matches_inventory_and_dewey_codes(self):
        by_inventory = self.make_book(title="Livre inventaire")
        Copy.objects.create(
            book=by_inventory,
            call_number="302.1 DEF",
            inventory_number="NE-4242",
            code1="302",
            code2="1",
            dewey="DEF",
            status=CopyStatus.AVAILABLE,
        )
        by_code = self.make_book(title="Autre ouvrage")
        Copy.objects.create(
            book=by_code,
            call_number="658 ABC",
            inventory_number="NE-9999",
            code1="658",
            code2="",
            dewey="ABC",
            status=CopyStatus.AVAILABLE,
        )
        inventory = self.api.get("/api/catalogue/livres/", {"q": "NE-4242"})
        self.assertEqual(inventory.status_code, 200)
        self.assertEqual(inventory.json()["count"], 1)
        self.assertEqual(inventory.json()["results"][0]["title"], "Livre inventaire")
        dewey = self.api.get("/api/catalogue/livres/", {"q": "302"})
        self.assertEqual(dewey.status_code, 200)
        self.assertEqual(dewey.json()["count"], 1)
        self.assertEqual(dewey.json()["results"][0]["title"], "Livre inventaire")
        letters = self.api.get("/api/catalogue/livres/", {"q": "DEF"})
        self.assertEqual(letters.status_code, 200)
        self.assertEqual(letters.json()["count"], 1)

    def test_public_autocomplete_and_filters(self):
        from apps.catalog.models import Publisher

        parent = Category.objects.create(name="Sciences sociales")
        child = Category.objects.create(name="Education", parent=parent)
        publisher = Publisher.objects.create(name="Presence Africaine")
        book = self.make_book(title="Manuel scolaire", category=child, publisher=publisher)
        Copy.objects.create(book=book, call_number="370 A", status=CopyStatus.AVAILABLE)

        classes = self.api.get("/api/catalogue/categories/", {"q": "Sciences"})
        self.assertEqual(classes.status_code, 200)
        self.assertTrue(any(item["name"] == "Sciences sociales" for item in classes.json()["results"]))

        # Sans parent : seulement les classes racines.
        roots = self.api.get("/api/catalogue/categories/")
        self.assertEqual(roots.status_code, 200)
        root_names = [item["name"] for item in roots.json()["results"]]
        self.assertIn("Sciences sociales", root_names)
        self.assertNotIn("Education", root_names)

        by_slug = self.api.get("/api/catalogue/categories/", {"slug": child.slug})
        self.assertEqual(by_slug.status_code, 200)
        self.assertEqual(by_slug.json()["results"][0]["slug"], child.slug)
        self.assertEqual(by_slug.json()["results"][0]["label"], "Sciences sociales — Education")

        children = self.api.get("/api/catalogue/categories/", {"parent": parent.pk, "q": "Educ"})
        self.assertEqual(children.status_code, 200)
        self.assertEqual(children.json()["results"][0]["name"], "Education")

        authors = self.api.get("/api/catalogue/auteurs/", {"q": "Sony"})
        self.assertEqual(authors.status_code, 200)
        self.assertTrue(any(item["name"] == "Sony Labou Tansi" for item in authors.json()["results"]))

        publishers = self.api.get("/api/catalogue/editeurs/", {"q": "Presence"})
        self.assertEqual(publishers.status_code, 200)
        self.assertEqual(publishers.json()["results"][0]["name"], "Presence Africaine")

        filtered = self.api.get(
            "/api/catalogue/livres/",
            {"categorie": child.slug, "auteur": self.author.pk, "editeur": publisher.pk},
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.json()["count"], 1)
        self.assertEqual(filtered.json()["results"][0]["title"], "Manuel scolaire")

        by_class = self.api.get("/api/catalogue/livres/", {"categorie": parent.slug})
        self.assertEqual(by_class.status_code, 200)
        self.assertEqual(by_class.json()["count"], 1)

        self.make_book(title="Second titre publie", category=child, publisher=publisher)
        page_two = self.api.get("/api/catalogue/livres/", {"page": 2, "page_size": 1})
        self.assertEqual(page_two.status_code, 200)
        self.assertEqual(page_two.json()["pages"], 2)
        self.assertEqual(page_two.json()["page"], 2)
        self.assertEqual(len(page_two.json()["results"]), 1)
