from datetime import timedelta

from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.roles import ROLE_ADMIN, ROLE_EDITOR, ROLE_LIBRARIAN, sync_roles

from .models import DailyTraffic, TrafficEvent, purge_old_events
from .paths import normalize_public_path
from .searches import normalize_search_term

PASSWORD = "MotDePasse-Personnel-2026"


class PathAndSearchTests(TestCase):
    def test_paths_and_search_sanitizing(self):
        self.assertEqual(normalize_public_path("/catalogue/livres/x"), "/catalogue/livres/x")
        self.assertEqual(normalize_public_path("/api/gestion/"), "")
        self.assertEqual(normalize_search_term("Contes africains"), "contes africains")
        self.assertEqual(normalize_search_term("a@b.com"), "")
        self.assertEqual(normalize_search_term("+243 800 000 000"), "")


class SiteStatisticsApiTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.admin = User.objects.create_user("admin-stats", password=PASSWORD)
        self.admin.groups.add(Group.objects.get(name=ROLE_ADMIN))
        self.editor = User.objects.create_user("redac-stats", password=PASSWORD)
        self.editor.groups.add(Group.objects.get(name=ROLE_EDITOR))
        self.librarian = User.objects.create_user("biblio-stats", password=PASSWORD)
        self.librarian.groups.add(Group.objects.get(name=ROLE_LIBRARIAN))

    def token(self):
        response = self.client.get("/api/visites/")
        return response.cookies["csrftoken"].value

    def login_as(self, username):
        self.client.post(
            "/api/gestion/session/",
            {"username": username, "password": PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )

    def test_public_records_without_storing_ip_or_ua(self):
        created = self.client.post(
            "/api/visites/",
            {"path": "/publications", "referrer": "https://www.facebook.com/"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
            HTTP_USER_AGENT="Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0",
        )
        self.assertEqual(created.status_code, 204, created.content)
        event = TrafficEvent.objects.get()
        field_names = {field.name for field in TrafficEvent._meta.fields}
        self.assertFalse({"ip", "remote_addr", "user_agent", "ua"} & field_names)
        self.assertEqual(len(event.visitor_hash), 64)
        self.assertNotIn(".", event.visitor_hash)
        self.assertEqual(event.origin, "facebook")
        self.assertEqual(DailyTraffic.objects.get().visits, 1)
        blob = str(event.__dict__).lower()
        self.assertNotIn("127.0.0.1", blob)

    def test_robots_are_ignored(self):
        response = self.client.post(
            "/api/visites/",
            {"path": "/"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
            HTTP_USER_AGENT="Mozilla/5.0 (compatible; Googlebot/2.1)",
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(TrafficEvent.objects.exists())

    def test_events_older_than_90_days_are_purged(self):
        old = TrafficEvent.objects.create(
            day=timezone.localdate() - timedelta(days=100),
            visitor_hash="a" * 64,
            path="/",
            device="desktop",
            origin="direct",
        )
        TrafficEvent.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=100))
        DailyTraffic.objects.create(day=old.day, visits=3, unique_visitors=2)
        deleted = purge_old_events()
        self.assertGreaterEqual(deleted, 1)
        self.assertFalse(TrafficEvent.objects.filter(pk=old.pk).exists())
        self.assertTrue(DailyTraffic.objects.filter(day=old.day).exists())

    def test_stats_api_admin_only(self):
        self.client.post(
            "/api/visites/",
            {"path": "/a-propos"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
            HTTP_USER_AGENT="Mozilla/5.0",
        )
        self.login_as("redac-stats")
        self.assertEqual(self.client.get("/api/gestion/statistiques/").status_code, 403)
        self.client.logout()
        self.login_as("biblio-stats")
        self.assertEqual(self.client.get("/api/gestion/statistiques/").status_code, 403)
        self.client.logout()
        self.login_as("admin-stats")
        allowed = self.client.get("/api/gestion/statistiques/")
        self.assertEqual(allowed.status_code, 200, allowed.content)
        body = allowed.json()
        self.assertIn("series", body)
        self.assertIn("top_pages", body)
        self.assertFalse(body["geo_available"])
        self.assertNotIn("ip", allowed.content.decode().lower())
        self.assertTrue(self.admin.has_perm("analytics.view_sitestat"))
        self.assertFalse(self.editor.has_perm("analytics.view_sitestat"))
        self.assertFalse(self.librarian.has_perm("analytics.view_sitestat"))
