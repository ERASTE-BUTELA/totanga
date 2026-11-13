import tempfile
from datetime import timedelta

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StaffAction, User
from apps.accounts.roles import ROLE_EDITOR, ROLE_LIBRARIAN, sync_roles
from apps.announcements.models import Announcement, AnnouncementState

TEST_MEDIA = tempfile.mkdtemp(prefix="totanga-annonces-")
PASSWORD = "MotDePasse-Personnel-2026"


@override_settings(MEDIA_ROOT=TEST_MEDIA)
class AnnouncementApiTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.editor = self.person("redacteur-annonce", ROLE_EDITOR)
        self.librarian = self.person("biblio-annonce", ROLE_LIBRARIAN)

    def person(self, username, role):
        user = User.objects.create_user(username, password=PASSWORD)
        user.groups.add(Group.objects.get(name=role))
        return user

    def token(self):
        response = self.client.get("/api/gestion/session/")
        return response.cookies["csrftoken"].value

    def login(self, user):
        return self.client.post(
            "/api/gestion/session/",
            {"username": user.username, "password": PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )

    def test_editor_publishes_and_librarian_cannot(self):
        self.login(self.librarian)
        refused = self.client.get("/api/gestion/annonces/")
        self.assertEqual(refused.status_code, 403)

        self.login(self.editor)
        created = self.client.post(
            "/api/gestion/annonces/",
            {
                "title": "Fermeture fictive",
                "body": "Ce texte est un exemple.",
                "category": "horaires",
                "important": "true",
                "state": "draft",
                "published_at": "2026-11-01T08:00:00+01:00",
                "display_until": "2026-10-01",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 400, created.content)

        created = self.client.post(
            "/api/gestion/annonces/",
            {
                "title": "Fermeture fictive",
                "body": "Ce texte est un exemple.",
                "category": "horaires",
                "important": "true",
                "state": "draft",
                "published_at": "2026-11-01T08:00:00+01:00",
                "display_until": "2026-11-30",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(created.json()["status"], "Brouillon")
        item_id = created.json()["id"]
        hidden = APIClient().get("/api/annonces/")
        self.assertNotIn("Fermeture fictive", hidden.content.decode())
        published = self.client.patch(
            f"/api/gestion/annonces/{item_id}/",
            {"state": "published"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(published.status_code, 200)
        public = APIClient().get("/api/annonces/")
        self.assertEqual(public.status_code, 200)
        self.assertIn("Fermeture fictive", public.content.decode())
        self.assertNotIn("email", public.content.decode())
        self.assertTrue(StaffAction.objects.filter(action="annonce_publication", target_id=str(item_id)).exists())
        removed = self.client.delete(
            f"/api/gestion/annonces/{item_id}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(Announcement.objects.filter(pk=item_id).exists())
        self.assertTrue(StaffAction.objects.filter(action="annonce_suppression", target_id=str(item_id)).exists())

    def test_archived_and_future_notices_stay_off_the_public_api(self):
        future = timezone.now() + timedelta(days=3)
        Announcement.objects.create(
            title="Brouillon secret",
            body="Ne pas publier.",
            category="informations",
            state=AnnouncementState.DRAFT,
            published_at=timezone.now(),
        )
        Announcement.objects.create(
            title="Archive secrète",
            body="Déjà rangée.",
            category="maintenance",
            state=AnnouncementState.ARCHIVED,
            published_at=timezone.now(),
        )
        Announcement.objects.create(
            title="Plus tard",
            body="Pas encore.",
            category="acquisitions",
            state=AnnouncementState.PUBLISHED,
            published_at=future,
        )
        body = APIClient().get("/api/annonces/").content.decode()
        self.assertNotIn("Brouillon secret", body)
        self.assertNotIn("Archive secrète", body)
        self.assertNotIn("Plus tard", body)

    def test_display_end_cannot_precede_publication(self):
        with self.assertRaises(ValidationError):
            Announcement.objects.create(
                title="Dates inversées",
                body="Exemple.",
                category="informations",
                published_at=timezone.now(),
                display_until=timezone.localdate() - timedelta(days=2),
            )
