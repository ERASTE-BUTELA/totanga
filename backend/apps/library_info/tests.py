from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.roles import ROLE_ADMIN, ROLE_LIBRARIAN, sync_roles
from apps.catalog.validators import prepare_catalog_image

from .html import sanitize_rich_text
from .models import Library

User = get_user_model()


def image_upload(name="logo.jpg"):
    from io import BytesIO

    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (64, 64), color=(80, 40, 120)).save(buffer, format="JPEG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")


class SanitizeTests(TestCase):
    def test_keeps_safe_markup(self):
        html = sanitize_rich_text('<p>Bonjour <strong>Totanga</strong></p><script>alert(1)</script>')
        self.assertIn("<p>", html)
        self.assertIn("<strong>", html)
        self.assertNotIn("<script>", html)

    def test_rejects_unsafe_links(self):
        html = sanitize_rich_text('<a href="javascript:alert(1)">x</a><a href="https://exemple.test">ok</a>')
        self.assertNotIn("javascript:", html)
        self.assertIn('href="https://exemple.test"', html)


class LibrarySettingsApiTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.admin = User.objects.create_user("admin_settings", password="MotDePasseFort1!")
        self.admin.groups.add(Group.objects.get(name=ROLE_ADMIN))
        self.librarian = User.objects.create_user("biblio_settings", password="MotDePasseFort1!")
        self.librarian.groups.add(Group.objects.get(name=ROLE_LIBRARIAN))

    def _login(self, username):
        self.client.get("/api/gestion/session/")
        token = self.client.cookies["csrftoken"].value
        response = self.client.post(
            "/api/gestion/session/",
            {"username": username, "password": "MotDePasseFort1!"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        token = self.client.cookies["csrftoken"].value
        return token

    def test_public_returns_solo_library(self):
        Library.get_solo()
        response = self.client.get("/api/bibliotheque/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "Bibliothèque Totanga")
        self.assertEqual(response.data["email"], "contact@exemple.totanga.test")

    def test_admin_can_persist_general_settings(self):
        token = self._login("admin_settings")
        response = self.client.patch(
            "/api/gestion/parametres/",
            {
                "name": "Bibliothèque Totanga Kinshasa",
                "slogan": "Lire ensemble",
                "address": "Avenue de la Paix",
                "city": "Kinshasa",
                "phone": "+243 900 000 001",
                "email": "accueil@totanga.test",
                "facebook_url": "https://facebook.com/totanga",
                "whatsapp_url": "+243800000001",
                "youtube_url": "https://youtube.com/@totanga",
                "instagram_url": "https://instagram.com/totanga",
                "tiktok_url": "https://tiktok.com/@totanga",
                "hours_text": "Lundi à vendredi 8 h – 17 h",
                "about": "<p>Présentation <em>officielle</em></p><script>x</script>",
                "language": "Français",
                "theme": "Violet (Totanga)",
                "dark_mode": "true",
                "timezone": "(UTC+01:00) Kinshasa",
                "date_format": "31/12/2026",
                "time_format": "12 heures (02:30 PM)",
                "page_size": "25",
                "maintenance": "true",
                "logo": image_upload(),
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200, response.data)
        library = Library.objects.get(pk=1)
        self.assertEqual(library.name, "Bibliothèque Totanga Kinshasa")
        self.assertEqual(library.page_size, 25)
        self.assertTrue(library.dark_mode)
        self.assertTrue(library.maintenance)
        self.assertTrue(library.logo_id)
        self.assertIn("<em>", library.about)
        self.assertNotIn("<script>", library.about)
        self.assertEqual(library.facebook_url, "https://facebook.com/totanga")
        self.assertEqual(library.whatsapp_url, "https://wa.me/243800000001")
        self.assertEqual(library.youtube_url, "https://youtube.com/@totanga")
        self.assertEqual(library.instagram_url, "https://instagram.com/totanga")
        self.assertEqual(library.tiktok_url, "https://tiktok.com/@totanga")
        self.assertEqual(library.hours_text, "Lundi à vendredi 8 h – 17 h")

        public = self.client.get("/api/bibliotheque/")
        self.assertEqual(public.data["name"], "Bibliothèque Totanga Kinshasa")
        self.assertTrue(public.data["logo"].startswith("/media/"))
        self.assertEqual(public.data["facebook_url"], "https://facebook.com/totanga")
        self.assertEqual(public.data["hours_summary"], "Lundi à vendredi 8 h – 17 h")
        self.assertEqual(public.data.get("hero_image"), "")
        self.assertEqual(
            public.data["social_links"],
            [
                {"label": "Facebook", "url": "https://facebook.com/totanga"},
                {"label": "WhatsApp", "url": "https://wa.me/243800000001"},
                {"label": "YouTube", "url": "https://youtube.com/@totanga"},
                {"label": "Instagram", "url": "https://instagram.com/totanga"},
                {"label": "TikTok", "url": "https://tiktok.com/@totanga"},
            ],
        )

    def test_admin_can_set_and_clear_hero_image(self):
        token = self._login("admin_settings")
        Library.get_solo()
        response = self.client.patch(
            "/api/gestion/parametres/",
            {
                "name": "Bibliothèque Totanga",
                "address": "Avenue de la Paix",
                "city": "Kinshasa",
                "phone": "+243 800 000 000",
                "email": "contact@exemple.totanga.test",
                "hero_image": image_upload("hero.jpg"),
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200, response.data)
        library = Library.objects.get(pk=1)
        self.assertTrue(library.hero_image_id)
        public = self.client.get("/api/bibliotheque/")
        self.assertTrue(public.data["hero_image"].startswith("/media/"))

        clear = self.client.patch(
            "/api/gestion/parametres/",
            {
                "name": "Bibliothèque Totanga",
                "address": "Avenue de la Paix",
                "city": "Kinshasa",
                "phone": "+243 800 000 000",
                "email": "contact@exemple.totanga.test",
                "clear_hero_image": "true",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(clear.status_code, 200, clear.data)
        library.refresh_from_db()
        self.assertFalse(library.hero_image_id)
        public = self.client.get("/api/bibliotheque/")
        self.assertEqual(public.data["hero_image"], "")

    def test_admin_can_persist_maps_location(self):
        token = self._login("admin_settings")
        Library.get_solo()
        response = self.client.patch(
            "/api/gestion/parametres/",
            {
                "name": "Bibliothèque Totanga",
                "address": "Avenue de la Paix",
                "city": "Kinshasa",
                "phone": "+243 800 000 000",
                "email": "contact@exemple.totanga.test",
                "maps_url": "https://www.google.com/maps/@-4.3276,15.3136,17z",
                "latitude": "-4.327600",
                "longitude": "15.313600",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200, response.data)
        library = Library.objects.get(pk=1)
        self.assertIn("15.3136", library.maps_url)
        self.assertEqual(float(library.latitude), -4.3276)
        self.assertEqual(float(library.longitude), 15.3136)
        public = self.client.get("/api/bibliotheque/")
        self.assertEqual(public.data["latitude"], -4.3276)
        self.assertEqual(public.data["longitude"], 15.3136)

    def test_librarian_cannot_change_settings(self):
        token = self._login("biblio_settings")
        response = self.client.patch(
            "/api/gestion/parametres/",
            {"name": "Interdit"},
            format="multipart",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 403)

    def test_prepare_image_still_works(self):
        content, size, extension = prepare_catalog_image(image_upload())
        self.assertGreater(size, 0)
        self.assertEqual(extension, "jpg")
        self.assertTrue(content)
