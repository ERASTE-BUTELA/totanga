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
from .sessions import count_visits_from_timestamps

PASSWORD = "MotDePasse-Personnel-2026"


class PathAndSearchTests(TestCase):
    def test_paths_and_search_sanitizing(self):
        self.assertEqual(normalize_public_path("/catalogue/livres/x"), "/catalogue/livres/x")
        self.assertEqual(normalize_public_path("/api/gestion/"), "")
        self.assertEqual(normalize_search_term("Contes africains"), "contes africains")
        self.assertEqual(normalize_search_term("a@b.com"), "")
        self.assertEqual(normalize_search_term("+243 800 000 000"), "")


class SessionCountingTests(TestCase):
    def test_four_morning_and_two_afternoon_make_two_visits(self):
        morning = timezone.now().replace(hour=9, minute=0, second=0, microsecond=0)
        afternoon = morning + timedelta(hours=5)
        moments = [
            morning,
            morning + timedelta(minutes=2),
            morning + timedelta(minutes=5),
            morning + timedelta(minutes=8),
            afternoon,
            afternoon + timedelta(minutes=3),
        ]
        self.assertEqual(count_visits_from_timestamps(moments), 2)

    def test_two_pages_under_thirty_minutes_are_one_visit(self):
        start = timezone.now()
        self.assertEqual(count_visits_from_timestamps([start, start + timedelta(minutes=29)]), 1)
        self.assertEqual(count_visits_from_timestamps([start, start + timedelta(minutes=30)]), 2)


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
        self.assertEqual(event.origin, "facebook")
        traffic = DailyTraffic.objects.get()
        self.assertEqual(traffic.page_views, 1)
        self.assertEqual(traffic.visits, 1)
        self.assertEqual(traffic.visitors, 1)
        self.assertNotIn("127.0.0.1", str(event.__dict__).lower())

    def test_one_visitor_two_visits_six_page_views(self):
        agent = "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0"
        morning_paths = ["/", "/catalogue", "/annonces", "/publications"]
        afternoon_paths = ["/evenements", "/a-propos"]
        for path in morning_paths:
            response = self.client.post(
                "/api/visites/",
                {"path": path},
                format="json",
                HTTP_X_CSRFTOKEN=self.token(),
                HTTP_USER_AGENT=agent,
            )
            self.assertEqual(response.status_code, 204, response.content)

        morning = timezone.now() - timedelta(hours=5)
        morning_ids = list(TrafficEvent.objects.values_list("pk", flat=True))
        for index, pk in enumerate(morning_ids):
            TrafficEvent.objects.filter(pk=pk).update(created_at=morning + timedelta(minutes=index * 2))

        for path in afternoon_paths:
            response = self.client.post(
                "/api/visites/",
                {"path": path},
                format="json",
                HTTP_X_CSRFTOKEN=self.token(),
                HTTP_USER_AGENT=agent,
            )
            self.assertEqual(response.status_code, 204, response.content)

        traffic = DailyTraffic.objects.get()
        self.assertEqual(TrafficEvent.objects.count(), 6)
        self.assertEqual(traffic.visitors, 1)
        self.assertEqual(traffic.visits, 2)
        self.assertEqual(traffic.page_views, 6)
        moments = list(TrafficEvent.objects.values_list("created_at", flat=True))
        self.assertEqual(count_visits_from_timestamps(moments), 2)

        self.login_as("admin-stats")
        body = self.client.get("/api/gestion/statistiques/").json()
        self.assertEqual(body["totals"]["today"]["visitors"], 1)
        self.assertEqual(body["totals"]["today"]["visits"], 2)
        self.assertEqual(body["totals"]["today"]["page_views"], 6)
        self.assertEqual(body["totals"]["today"]["pages_per_visit"], 3.0)

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
        DailyTraffic.objects.create(day=old.day, visitors=2, visits=3, page_views=6)
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
        self.assertIn("page_views", body["series"][0])
        self.assertIn("visitors", body["totals"]["today"])
        self.assertIn("definitions", body)
        self.assertFalse(body["geo_available"])
        self.assertNotIn("ip", allowed.content.decode().lower())
