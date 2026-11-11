import tempfile
from datetime import timedelta

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.roles import ROLE_EDITOR, ROLE_LIBRARIAN, sync_roles
from apps.events.models import Event, EventState, Speaker

TEST_MEDIA = tempfile.mkdtemp(prefix="totanga-evenements-")
PASSWORD = "MotDePasse-Personnel-2026"


@override_settings(MEDIA_ROOT=TEST_MEDIA)
class EventApiTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.editor = User.objects.create_user("redacteur-event", password=PASSWORD)
        self.editor.groups.add(Group.objects.get(name=ROLE_EDITOR))
        self.librarian = User.objects.create_user("biblio-event", password=PASSWORD)
        self.librarian.groups.add(Group.objects.get(name=ROLE_LIBRARIAN))

    def token(self):
        return self.client.get("/api/gestion/session/").cookies["csrftoken"].value

    def login(self, user):
        return self.client.post(
            "/api/gestion/session/",
            {"username": user.username, "password": PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )

    def test_editor_creates_an_event_and_a_draft_stays_hidden(self):
        self.login(self.librarian)
        self.assertEqual(self.client.get("/api/gestion/evenements/").status_code, 403)
        self.login(self.editor)
        start = (timezone.now() + timedelta(days=2)).replace(microsecond=0)
        end = start + timedelta(hours=2)
        created = self.client.post(
            "/api/gestion/evenements/",
            {
                "title": "Lecture fictive",
                "summary": "Une rencontre imaginaire.",
                "event_type": "lecture",
                "starts_at": start.isoformat(),
                "ends_at": end.isoformat(),
                "location": "Salle d'exemple",
                "programme": "Accueil\nLecture\nÉchange",
                "registration_url": "javascript:alert(1)",
                "speakers": '[{"name":"Amina Exemple","title":"Conteuse","position":1}]',
                "state": "published",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(created.json()["registration_url"], "")
        self.assertEqual(created.json()["speakers"][0]["name"], "Amina Exemple")
        public = APIClient().get("/api/evenements/")
        self.assertIn("Lecture fictive", public.content.decode())
        self.assertNotIn("javascript", public.content.decode())
        self.assertNotIn("email", public.content.decode())
        draft = Event.objects.create(
            title="Brouillon secret",
            summary="Caché.",
            event_type="atelier",
            starts_at=start,
            ends_at=end,
            location="Salle",
            state=EventState.DRAFT,
        )
        self.assertEqual(APIClient().get(f"/api/evenements/{draft.slug}/").status_code, 404)
        removed = self.client.delete(
            f"/api/gestion/evenements/{created.json()['id']}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(removed.status_code, 405)

    def test_end_must_follow_the_start_and_speakers_stop_at_five(self):
        start = timezone.now() + timedelta(days=1)
        with self.assertRaises(ValidationError):
            Event.objects.create(
                title="À l'envers",
                summary="Exemple.",
                event_type="atelier",
                starts_at=start,
                ends_at=start,
                location="Salle",
            )
        event = Event.objects.create(
            title="Avec intervenants",
            summary="Exemple.",
            event_type="conference",
            starts_at=start,
            ends_at=start + timedelta(hours=1),
            location="Salle",
            state=EventState.PUBLISHED,
        )
        for position in range(1, 6):
            Speaker.objects.create(event=event, name=f"Personne {position}", position=position)
        with self.assertRaises(Exception):
            with transaction.atomic():
                Speaker.objects.create(event=event, name="En trop", position=1)
        self.assertEqual(event.speakers.count(), 5)

    def test_a_duplicate_speaker_order_is_refused(self):
        start = timezone.now() + timedelta(days=1)
        event = Event.objects.create(
            title="Ordre",
            summary="Exemple.",
            event_type="salon",
            starts_at=start,
            ends_at=start + timedelta(hours=1),
            location="Hall",
        )
        Speaker.objects.create(event=event, name="Une", position=1)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Speaker.objects.create(event=event, name="Deux", position=1)
