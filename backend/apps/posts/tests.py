from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StaffAction, User
from apps.accounts.roles import ROLE_EDITOR, sync_roles

from .models import Publication, PublicationState


class PublicationApiTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.editor = User.objects.create_user("redac-pub", password="MotDePasse-Personnel-2026")
        self.editor.groups.add(Group.objects.get(name=ROLE_EDITOR))

    def token(self):
        response = self.client.get("/api/gestion/session/")
        return response.cookies["csrftoken"].value

    def login(self):
        return self.client.post(
            "/api/gestion/session/",
            {"username": "redac-pub", "password": "MotDePasse-Personnel-2026"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )

    def test_staff_can_create_and_delete_publication(self):
        self.login()
        created = self.client.post(
            "/api/gestion/publications/",
            {
                "title": "Lire ensemble",
                "category": "Culture",
                "author": "Équipe Totanga",
                "excerpt": "Un résumé utile pour le site.",
                "content": "<p>Contenu de la publication.</p>",
                "published_at": timezone.now().isoformat(),
                "state": "published",
            },
            format="multipart",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201, created.content)
        item_id = created.json()["id"]
        self.assertTrue(Publication.objects.filter(pk=item_id).exists())
        public = APIClient().get("/api/publications/")
        self.assertEqual(public.status_code, 200)
        self.assertIn("Lire ensemble", public.content.decode())
        removed = self.client.delete(
            f"/api/gestion/publications/{item_id}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(Publication.objects.filter(pk=item_id).exists())
        self.assertTrue(StaffAction.objects.filter(action="publication_suppression", target_id=str(item_id)).exists())
        self.assertNotIn("Lire ensemble", APIClient().get("/api/publications/").content.decode())

    def test_draft_stays_off_public_api(self):
        Publication.objects.create(
            title="Brouillon secret",
            excerpt="Résumé",
            content="<p>Texte</p>",
            state=PublicationState.DRAFT,
            published_at=timezone.now(),
        )
        body = APIClient().get("/api/publications/").content.decode()
        self.assertNotIn("Brouillon secret", body)
