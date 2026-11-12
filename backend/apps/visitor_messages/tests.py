from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory

from .models import VisitorMessage
from .views import VisitorMessageListCreateView, VisitorMessageThrottle


class VisitorMessageApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)

    def token(self):
        response = self.client.get("/api/messages/")
        self.assertEqual(response.status_code, 200)
        return response.cookies["csrftoken"].value

    def test_public_list_hides_the_email(self):
        VisitorMessage.objects.create(
            name="Amina",
            email="amina@exemple.totanga.test",
            subject="generale",
            body="Bonjour la bibliothèque.",
        )
        response = self.client.get("/api/messages/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("email", response.json()[0])
        self.assertNotIn("amina@exemple.totanga.test", response.content.decode())
        self.assertEqual(response.json()[0]["subject"], "Question générale")

    def test_post_without_csrf_is_refused(self):
        response = self.client.post(
            "/api/messages/",
            {"name": "Amina", "email": "amina@exemple.totanga.test", "subject": "generale", "body": "Bonjour la bibliothèque."},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(VisitorMessage.objects.count(), 0)

    def test_post_stores_the_message_and_hides_the_email(self):
        response = self.client.post(
            "/api/messages/",
            {"name": "Amina", "email": "amina@exemple.totanga.test", "subject": "horaires", "body": "Quels sont vos horaires du samedi ?"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("email", response.json())
        self.assertNotIn("whatsapp", response.json())
        stored = VisitorMessage.objects.get()
        self.assertEqual(stored.email, "amina@exemple.totanga.test")
        self.assertEqual(response.json()["name"], "Amina")

    def test_post_accepts_whatsapp_without_email(self):
        response = self.client.post(
            "/api/messages/",
            {
                "name": "Paul",
                "whatsapp": "+243 800 000 002",
                "subject": "catalogue",
                "body": "Cherche un livre d'histoire congolaise.",
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 201, response.data)
        stored = VisitorMessage.objects.get()
        self.assertEqual(stored.email, "")
        self.assertEqual(stored.whatsapp, "243800000002")
        self.assertNotIn("whatsapp", response.json())

    def test_post_requires_email_or_whatsapp(self):
        response = self.client.post(
            "/api/messages/",
            {"name": "Paul", "subject": "autre", "body": "Bonjour la bibliothèque."},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(VisitorMessage.objects.count(), 0)

    def test_post_rejects_markup_and_unknown_subject(self):
        token = self.token()
        markup = self.client.post(
            "/api/messages/",
            {"name": "Amina", "email": "amina@exemple.totanga.test", "subject": "autre", "body": "<b>Bonjour la bibliothèque</b>"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        unknown = self.client.post(
            "/api/messages/",
            {"name": "Amina", "email": "amina@exemple.totanga.test", "subject": "secret", "body": "Bonjour la bibliothèque."},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(markup.status_code, 400)
        self.assertEqual(unknown.status_code, 400)
        self.assertEqual(VisitorMessage.objects.count(), 0)

    def test_throttle_uses_the_connection_address(self):
        throttle = VisitorMessageThrottle()
        view = VisitorMessageListCreateView()
        factory = APIRequestFactory()
        first = factory.post("/api/messages/", HTTP_X_FORWARDED_FOR="1.2.3.4")
        second = factory.post("/api/messages/", HTTP_X_FORWARDED_FOR="5.6.7.8")
        self.assertEqual(
            throttle.get_cache_key(first, view),
            throttle.get_cache_key(second, view),
        )
        self.assertIsNone(throttle.get_cache_key(factory.get("/api/messages/"), view))

    def test_ninth_message_in_an_hour_is_blocked(self):
        cache.clear()
        token = self.token()
        payload = {
            "name": "Amina",
            "email": "amina@exemple.totanga.test",
            "subject": "autre",
            "body": "Bonjour la bibliothèque.",
        }
        for _number in range(8):
            response = self.client.post(
                "/api/messages/",
                payload,
                format="json",
                HTTP_X_CSRFTOKEN=token,
            )
            self.assertEqual(response.status_code, 201)
        blocked = self.client.post(
            "/api/messages/",
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(VisitorMessage.objects.count(), 8)
