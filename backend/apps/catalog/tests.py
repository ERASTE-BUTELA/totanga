import tempfile
from io import BytesIO

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.roles import ROLE_EDITOR, ROLE_LIBRARIAN, sync_roles
from apps.catalog.models import (
    Author,
    Book,
    BookCannotBeDeleted,
    Category,
    Copy,
    CopyStatus,
)
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

    def test_rejects_a_file_over_two_megabytes(self):
        upload = SimpleUploadedFile("couverture.jpg", b"x" * (2 * 1024 * 1024 + 1))
        with self.assertRaisesMessage(ValidationError, "2 Mo"):
            validate_catalog_image(upload)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class BookCatalogTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Roman africain")
        self.author = Author.objects.create(name="Sony Labou Tansi")

    def make_book(self, **overrides):
        author = overrides.pop("author", self.author)
        values = {
            "title": "La Vie et demie",
            "category": self.category,
            "publication_year": 1979,
            "summary": "Un roman.",
            "cover": image_upload("couverture.jpg", "JPEG"),
        }
        values.update(overrides)
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
        self.assertTrue(book.archived)


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

    def test_category_used_by_a_book_is_kept(self):
        self.login(self.librarian)
        book = Book.objects.create(
            title="Verre cassé",
            category=self.category,
            publication_year=2005,
            summary="Un roman.",
            cover=image_upload("couverture.jpg", "JPEG"),
        )
        book.authors.add(self.author)
        response = self.client.delete(
            f"/api/gestion/catalogue/categories/{self.category.pk}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 409)
        self.assertTrue(Category.objects.filter(pk=self.category.pk).exists())
