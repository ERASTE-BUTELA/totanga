import os
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.guards import LastAdministratorError
from apps.accounts.models import StaffAction
from apps.accounts.management.commands.create_role_samples import SAMPLES
from apps.accounts.roles import ROLE_ADMIN, ROLE_EDITOR, ROLE_LIBRARIAN, sync_roles
from apps.accounts.session_limits import LAST_KEY, STARTED_KEY
from apps.visitor_messages.models import VisitorMessage
from config.urls import build_urlpatterns

User = get_user_model()
PASSWORD = "MotDePasse-Personnel-2026"


def routes(*, django_admin, debug):
    return [
        str(pattern.pattern)
        for pattern in build_urlpatterns(django_admin=django_admin, debug=debug)
    ]


class CreateAdminCommandTests(TestCase):
    def test_creates_a_group_admin_and_keeps_the_existing_password(self):
        initial_password = "MotDePasse-Initial-2026"
        personal_password = "MotDePasse-Choisi-2026"
        replacement_password = "MotDePasse-Ne-Doit-Pas-Ecraser-2026"
        environment = {
            "DJANGO_SUPERUSER_USERNAME": "admin",
            "DJANGO_SUPERUSER_EMAIL": "admin@totanga.local",
            "DJANGO_SUPERUSER_PASSWORD": initial_password,
        }

        output = StringIO()
        with patch.dict(os.environ, environment):
            call_command("create_admin", stdout=output)

        user = User.objects.get(username="admin")
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.groups.filter(name=ROLE_ADMIN).exists())
        self.assertEqual(user.email, "admin@totanga.local")
        self.assertTrue(user.check_password(initial_password))
        self.assertNotIn(initial_password, output.getvalue())
        self.assertNotIn("admin@totanga.local", output.getvalue())

        user.set_password(personal_password)
        user.email = "autre@totanga.local"
        user.is_superuser = True
        user.is_staff = True
        user.save()
        break_glass = User.objects.create_superuser(
            username="depannage",
            email="depannage@totanga.local",
            password=personal_password,
        )

        output = StringIO()
        environment["DJANGO_SUPERUSER_EMAIL"] = "nouveau@totanga.local"
        environment["DJANGO_SUPERUSER_PASSWORD"] = replacement_password
        with patch.dict(os.environ, environment):
            call_command("create_admin", stdout=output)

        user.refresh_from_db()
        break_glass.refresh_from_db()
        self.assertEqual(user.email, "autre@totanga.local")
        self.assertTrue(user.check_password(personal_password))
        self.assertFalse(user.check_password(replacement_password))
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.groups.filter(name=ROLE_ADMIN).exists())
        self.assertTrue(break_glass.is_superuser)
        self.assertNotIn(replacement_password, output.getvalue())
        self.assertNotIn("nouveau@totanga.local", output.getvalue())

    def test_skips_creation_when_variables_are_missing(self):
        output = StringIO()
        with patch.dict(
            os.environ,
            {
                "DJANGO_SUPERUSER_USERNAME": "",
                "DJANGO_SUPERUSER_EMAIL": "",
                "DJANGO_SUPERUSER_PASSWORD": "",
            },
        ):
            call_command("create_admin", stdout=output)

        self.assertEqual(User.objects.count(), 0)
        self.assertIn("Administrateur non créé", output.getvalue())
        self.assertNotIn("mot de passe", output.getvalue().lower())


class RolePermissionTests(TestCase):
    def test_groups_grant_only_their_rights(self):
        sync_roles()
        sync_roles()
        self.assertEqual(Group.objects.count(), 3)

        admin = User.objects.create_user("admin-droits", password=PASSWORD)
        librarian = User.objects.create_user("biblio-droits", password=PASSWORD)
        editor = User.objects.create_user("redacteur-droits", password=PASSWORD)
        admin.groups.add(Group.objects.get(name=ROLE_ADMIN))
        librarian.groups.add(Group.objects.get(name=ROLE_LIBRARIAN))
        editor.groups.add(Group.objects.get(name=ROLE_EDITOR))

        self.assertTrue(admin.has_perm("accounts.view_user"))
        self.assertTrue(admin.has_perm("catalog.change_book"))
        self.assertTrue(admin.has_perm("visitor_messages.view_visitormessage"))
        self.assertFalse(admin.has_perm("catalog.delete_book"))
        self.assertTrue(librarian.has_perm("catalog.add_copy"))
        self.assertTrue(librarian.has_perm("catalog.change_book"))
        self.assertFalse(librarian.has_perm("catalog.delete_book"))
        self.assertFalse(librarian.has_perm("accounts.view_user"))
        self.assertFalse(librarian.has_perm("visitor_messages.view_visitormessage"))
        self.assertFalse(editor.has_perm("catalog.view_book"))
        self.assertFalse(editor.has_perm("accounts.view_user"))
        self.assertTrue(editor.has_perm("announcements.add_announcement"))
        self.assertTrue(editor.has_perm("events.change_event"))
        self.assertFalse(editor.has_perm("announcements.delete_announcement"))
        self.assertFalse(librarian.has_perm("announcements.view_announcement"))
        self.assertTrue(admin.has_perm("events.add_event"))
        self.assertEqual(editor.groups.get().permissions.count(), 6)


class StaffSessionApiTests(TestCase):
    def setUp(self):
        cache.clear()
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.admin = self.person("admin-session", ROLE_ADMIN)
        self.editor = self.person("redacteur-session", ROLE_EDITOR)
        self.librarian = self.person("biblio-session", ROLE_LIBRARIAN)

    def person(self, username, role):
        user = User.objects.create_user(username, password=PASSWORD)
        user.groups.add(Group.objects.get(name=role))
        return user

    def token(self):
        response = self.client.get("/api/gestion/session/")
        self.assertIn(response.status_code, (200, 204))
        return response.cookies["csrftoken"].value

    def login(self, username, password, token=None):
        return self.client.post(
            "/api/gestion/session/",
            {"username": username, "password": password},
            format="json",
            HTTP_X_CSRFTOKEN=token or self.token(),
        )

    def test_login_logout_and_cookie_flags(self):
        response = self.login(self.admin.username, PASSWORD)
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["role"], ROLE_ADMIN)
        self.assertEqual(payload["role_label"], "Administrateur")
        self.assertNotIn("email", payload)
        self.assertIn("joined", payload)
        self.assertTrue(payload["last_login"])
        self.assertNotIn("is_superuser", payload)
        self.assertIn("accounts.view_user", payload["permissions"])
        self.assertNotIn("catalog.delete_book", payload["permissions"])
        self.assertTrue(self.client.cookies["sessionid"]["httponly"])
        self.assertFalse(self.client.cookies["csrftoken"]["httponly"])
        self.assertNotIn(PASSWORD, response.content.decode())

        action = StaffAction.objects.get(action="connexion")
        self.assertEqual(action.actor, self.admin)
        self.assertEqual(action.target_id, str(self.admin.pk))
        self.assertFalse({"password", "email", "body"} & {field.name for field in StaffAction._meta.fields})

        account = self.client.get("/api/gestion/compte/")
        self.assertEqual(account.status_code, 200)
        self.assertEqual(account.json()["username"], self.admin.username)

        refused = self.client.delete("/api/gestion/session/")
        self.assertEqual(refused.status_code, 403)
        self.assertEqual(self.client.get("/api/gestion/compte/").status_code, 200)

        goodbye = self.client.delete(
            "/api/gestion/session/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(goodbye.status_code, 204)
        self.assertEqual(self.client.get("/api/gestion/compte/").status_code, 401)
        self.assertTrue(StaffAction.objects.filter(action="deconnexion", actor=self.admin).exists())

    def test_unknown_user_and_bad_password_look_the_same(self):
        unknown = self.login("personne-inconnue", "MotDePasse-Faux-2026")
        wrong = self.login(self.admin.username, "MotDePasse-Faux-2026")
        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(unknown.json(), wrong.json())
        self.assertNotIn("personne-inconnue", unknown.content.decode())
        self.assertNotIn(self.admin.username, wrong.content.decode())
        self.assertFalse(StaffAction.objects.filter(action="connexion_refusee", actor__isnull=False).exists())

    def test_inactive_account_and_account_without_role_look_unknown(self):
        inactive = self.person("compte-inactif", ROLE_ADMIN)
        inactive.is_active = False
        inactive.save(update_fields=["is_active"])
        User.objects.create_user("compte-sans-role", password=PASSWORD)

        unknown = self.login("personne-absente", PASSWORD)
        inactive_response = self.login(inactive.username, PASSWORD)
        without_role = self.login("compte-sans-role", PASSWORD)
        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(unknown.json(), inactive_response.json())
        self.assertEqual(unknown.json(), without_role.json())

    def test_too_many_attempts_are_blocked_even_with_the_right_password(self):
        username = self.librarian.username
        for _attempt in range(4):
            response = self.login(username, "MotDePasse-Faux-2026")
            self.assertEqual(response.status_code, 401)
        blocked = self.login(username, "MotDePasse-Faux-2026")
        self.assertEqual(blocked.status_code, 429)
        still_blocked = self.login(username, PASSWORD)
        self.assertEqual(still_blocked.status_code, 429)
        self.assertNotIn(username, still_blocked.content.decode())

    def test_request_without_csrf_is_refused(self):
        self.token()
        response = self.client.post(
            "/api/gestion/session/",
            {"username": self.admin.username, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(StaffAction.objects.filter(action="connexion").exists())

    def test_expired_session_is_refused(self):
        self.assertEqual(self.login(self.admin.username, PASSWORD).status_code, 200)
        session = self.client.session
        session[LAST_KEY] = (timezone.now() - timedelta(minutes=31)).isoformat()
        session.save()
        expired = self.client.get("/api/gestion/session/")
        self.assertEqual(expired.status_code, 401)
        self.assertEqual(expired.json(), {"detail": "Session expirée."})
        self.assertEqual(self.client.get("/api/gestion/compte/").status_code, 401)

        self.assertEqual(self.login(self.admin.username, PASSWORD).status_code, 200)
        session = self.client.session
        session[STARTED_KEY] = (timezone.now() - timedelta(hours=11)).isoformat()
        session[LAST_KEY] = timezone.now().isoformat()
        session.save()
        self.assertEqual(self.client.get("/api/gestion/compte/").status_code, 401)

    def test_activity_does_not_extend_the_ten_hour_limit(self):
        self.assertEqual(self.login(self.admin.username, PASSWORD).status_code, 200)
        started = timezone.now() - timedelta(hours=9)
        session = self.client.session
        session[STARTED_KEY] = started.isoformat()
        session[LAST_KEY] = timezone.now().isoformat()
        session.save()
        self.assertEqual(self.client.get("/api/gestion/compte/").status_code, 200)
        remaining = self.client.session.get_expiry_date() - timezone.now()
        self.assertLess(remaining, timedelta(hours=2))
        self.assertGreater(remaining, timedelta(minutes=50))

    def test_role_without_permission_is_refused_by_the_server(self):
        self.assertEqual(self.login(self.editor.username, PASSWORD).status_code, 200)
        refused = self.client.get("/api/gestion/utilisateurs/")
        self.assertEqual(refused.status_code, 403)

        self.client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(self.login(self.librarian.username, PASSWORD).status_code, 200)
        self.assertEqual(self.client.get("/api/gestion/utilisateurs/").status_code, 403)

        self.client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(self.login(self.admin.username, PASSWORD).status_code, 200)
        allowed = self.client.get("/api/gestion/utilisateurs/")
        self.assertEqual(allowed.status_code, 200)
        self.assertNotIn("email", allowed.content.decode())
        usernames = [person["username"] for person in allowed.json()]
        self.assertIn(self.editor.username, usernames)
        self.assertTrue(all("email" not in person for person in allowed.json()))

    def test_break_glass_superuser_can_still_sign_in(self):
        User.objects.create_superuser(
            username="depannage",
            email="depannage@totanga.local",
            password=PASSWORD,
        )
        response = self.login("depannage", PASSWORD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "depannage")
        self.assertNotIn("depannage@totanga.local", response.content.decode())
        self.assertEqual(self.client.get("/api/gestion/utilisateurs/").status_code, 200)

    def test_admin_creates_a_staff_account_with_a_generated_password(self):
        self.assertEqual(self.login(self.admin.username, PASSWORD).status_code, 200)
        supplied = "MotDePasse-Choisi-Par-Le-Client"
        created = self.client.post(
            "/api/gestion/utilisateurs/",
            {
                "username": "nouveau-personnel",
                "first_name": "Amina",
                "last_name": "Nsiku",
                "role": ROLE_LIBRARIAN,
                "password": supplied,
                "email": "amina@exemple.totanga.test",
                "is_superuser": True,
                "is_staff": True,
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201)
        payload = created.json()
        password = payload["password"]
        self.assertGreaterEqual(len(password), 20)
        self.assertNotEqual(password, supplied)
        self.assertNotIn("email", payload)
        self.assertNotIn("amina@exemple.totanga.test", created.content.decode())

        user = User.objects.get(username="nouveau-personnel")
        self.assertEqual(user.get_full_name(), "Amina Nsiku")
        self.assertEqual(user.email, "")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password(password))
        self.assertFalse(user.check_password(supplied))
        self.assertEqual(list(user.groups.values_list("name", flat=True)), [ROLE_LIBRARIAN])
        self.assertTrue(user.has_perm("catalog.view_book"))
        self.assertFalse(user.has_perm("accounts.add_user"))

        action = StaffAction.objects.get(action="creation_compte")
        self.assertEqual(action.actor, self.admin)
        self.assertEqual(action.target_id, str(user.pk))
        self.assertNotIn(password, f"{action.action} {action.target_type} {action.target_id}")

        listed = self.client.get("/api/gestion/utilisateurs/")
        self.assertNotIn(password, listed.content.decode())
        self.assertNotIn("email", listed.content.decode())
        self.assertTrue(all("password" not in person for person in listed.json()))

        guest = APIClient(enforce_csrf_checks=True)
        token = guest.get("/api/gestion/session/").cookies["csrftoken"].value
        signed = guest.post(
            "/api/gestion/session/",
            {"username": "nouveau-personnel", "password": password},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(signed.status_code, 200)
        self.assertEqual(signed.json()["role"], ROLE_LIBRARIAN)
        self.assertNotIn(password, signed.content.decode())

    def test_staff_creation_rejects_the_wrong_role_and_a_duplicate(self):
        self.assertEqual(self.login(self.librarian.username, PASSWORD).status_code, 200)
        refused = self.client.post(
            "/api/gestion/utilisateurs/",
            {
                "username": "compte-interdit",
                "first_name": "Jean",
                "last_name": "Kanza",
                "role": ROLE_EDITOR,
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(refused.status_code, 403)
        self.assertFalse(User.objects.filter(username="compte-interdit").exists())

        self.client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(self.login(self.admin.username, PASSWORD).status_code, 200)
        missing = self.client.post(
            "/api/gestion/utilisateurs/",
            {
                "username": "compte-sans-jeton",
                "first_name": "Jean",
                "last_name": "Kanza",
                "role": ROLE_EDITOR,
            },
            format="json",
        )
        self.assertEqual(missing.status_code, 403)
        self.assertFalse(User.objects.filter(username="compte-sans-jeton").exists())

        technical = self.client.post(
            "/api/gestion/utilisateurs/",
            {
                "username": "compte-depannage",
                "first_name": "Jean",
                "last_name": "Kanza",
                "role": "depannage",
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(technical.status_code, 400)
        self.assertFalse(User.objects.filter(username="compte-depannage").exists())

        blank = self.client.post(
            "/api/gestion/utilisateurs/",
            {"username": "   ", "first_name": "Jean", "last_name": "Kanza", "role": ROLE_EDITOR},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(blank.status_code, 400)

        created = self.client.post(
            "/api/gestion/utilisateurs/",
            {
                "username": "compte-unique",
                "first_name": "Jean",
                "last_name": "Kanza",
                "role": ROLE_EDITOR,
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(created.status_code, 201)
        duplicate = self.client.post(
            "/api/gestion/utilisateurs/",
            {
                "username": "compte-unique",
                "first_name": "Jean",
                "last_name": "Kanza",
                "role": ROLE_EDITOR,
            },
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(User.objects.filter(username="compte-unique").count(), 1)


class PublicSurfaceTests(TestCase):
    def test_public_api_hides_accounts_emails_and_unpublished_routes(self):
        """Les anciennes adresses restent fermées. Le catalogue public ne montre ni compte ni adresse e-mail."""

        User.objects.create_user("compte-cache-du-personnel", password=PASSWORD)
        VisitorMessage.objects.create(
            name="Amina",
            email="cachette@exemple.totanga.test",
            subject="generale",
            body="Bonjour, ceci est un message de démonstration.",
        )
        client = APIClient()
        messages = client.get("/api/messages/")
        self.assertEqual(messages.status_code, 200)
        text = messages.content.decode()
        self.assertNotIn("cachette@exemple.totanga.test", text)
        self.assertNotIn("compte-cache-du-personnel", text)
        self.assertNotIn("email", messages.json()[0])

        for path in (
            "/api/livres/",
            "/api/books/",
            "/api/publications/",
        ):
            self.assertEqual(client.get(path).status_code, 404)
        catalog = client.get("/api/catalogue/livres/")
        self.assertEqual(catalog.status_code, 200)
        self.assertNotIn("email", catalog.content.decode())
        notices = client.get("/api/annonces/")
        events = client.get("/api/evenements/")
        self.assertEqual(notices.status_code, 200)
        self.assertEqual(events.status_code, 200)
        self.assertNotIn("email", notices.content.decode())
        self.assertNotIn("email", events.content.decode())
        self.assertEqual(client.get("/api/publications/").status_code, 404)
        self.assertEqual(client.get("/api/gestion/utilisateurs/").status_code, 401)
        self.assertEqual(client.get("/api/gestion/compte/").status_code, 401)

    def test_production_urls_omit_django_admin(self):
        opened = routes(django_admin=True, debug=True)
        closed = routes(django_admin=False, debug=False)
        self.assertIn("admin/", opened)
        self.assertNotIn("admin/", closed)
        self.assertNotIn("admin/", routes(django_admin=False, debug=True))
        self.assertIn("api/gestion/", closed)
        self.assertIn("api/messages/", closed)


class LastAdministratorTests(TestCase):
    def test_the_last_administrator_cannot_be_removed(self):
        sync_roles()
        keeper = User.objects.create_user("seul-admin", password=PASSWORD)
        keeper.groups.add(Group.objects.get(name=ROLE_ADMIN))
        other = User.objects.create_user("autre-admin", password=PASSWORD)
        other.groups.add(Group.objects.get(name=ROLE_ADMIN))
        other.is_active = False
        other.save(update_fields=["is_active"])

        with self.assertRaises(LastAdministratorError):
            keeper.is_active = False
            keeper.save(update_fields=["is_active"])
        keeper.refresh_from_db()
        self.assertTrue(keeper.is_active)

    def test_the_last_administrator_cannot_leave_the_group(self):
        sync_roles()
        keeper = User.objects.create_user("seul-admin-groupe", password=PASSWORD)
        keeper.groups.add(Group.objects.get(name=ROLE_ADMIN))
        with self.assertRaises(LastAdministratorError):
            keeper.groups.remove(Group.objects.get(name=ROLE_ADMIN))

    def test_the_last_administrator_cannot_be_deleted(self):
        sync_roles()
        keeper = User.objects.create_user("seul-admin-suppression", password=PASSWORD)
        keeper.groups.add(Group.objects.get(name=ROLE_ADMIN))
        with self.assertRaises(LastAdministratorError):
            keeper.delete()
        self.assertTrue(User.objects.filter(pk=keeper.pk, is_active=True).exists())


class SuperuserAccessTests(TestCase):
    def setUp(self):
        sync_roles()
        self.client = APIClient(enforce_csrf_checks=True)
        self.superuser = User.objects.create_user("essai-super-test", password=PASSWORD)
        self.superuser.is_superuser = True
        self.superuser.is_staff = False
        self.superuser.save()
        self.superuser.groups.clear()

    def token(self):
        response = self.client.get("/api/gestion/session/")
        return response.cookies["csrftoken"].value

    def test_superuser_without_a_group_can_open_staff_areas_and_is_audited(self):
        signed = self.client.post(
            "/api/gestion/session/",
            {"username": self.superuser.username, "password": PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(signed.status_code, 200)
        self.assertEqual(signed.json()["role"], "depannage")
        self.assertEqual(signed.json()["role_label"], "Super-administrateur")
        self.assertNotIn("email", signed.json())
        self.assertIn("announcements.add_announcement", signed.json()["permissions"])
        for path in (
            "/api/gestion/catalogue/livres/",
            "/api/gestion/annonces/",
            "/api/gestion/evenements/",
            "/api/gestion/utilisateurs/",
            "/api/gestion/journal/",
            "/api/gestion/messages/",
        ):
            self.assertEqual(self.client.get(path).status_code, 200, path)
        self.assertTrue(StaffAction.objects.filter(action="connexion", actor=self.superuser).exists())
        from apps.catalog.models import Book, Category

        category = Category.objects.create(name="Romans du super")
        book = Book.objects.create(title="Livre protégé", category=category, state="published")
        removed = self.client.delete(
            f"/api/gestion/catalogue/livres/{book.pk}/",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(removed.status_code, 405)
        self.assertTrue(Book.objects.filter(pk=book.pk).exists())


class RoleSampleCommandTests(TestCase):
    def test_refuses_when_debug_is_off(self):
        output = StringIO()
        with override_settings(DEBUG=False):
            with self.assertRaises(CommandError):
                call_command("create_role_samples", stdout=output)

        self.assertEqual(User.objects.count(), 0)
        self.assertNotIn("MotDePasse", output.getvalue())

    def test_creates_one_account_per_role_without_printing_passwords(self):
        output = StringIO()
        with override_settings(DEBUG=True):
            call_command("create_role_samples", stdout=output)
            call_command("create_role_samples", stdout=output)

        self.assertEqual(User.objects.count(), 4)
        for username, password, role in SAMPLES:
            user = User.objects.get(username=username)
            self.assertFalse(user.is_superuser)
            self.assertFalse(user.is_staff)
            self.assertTrue(user.check_password(password))
            self.assertEqual(list(user.groups.values_list("name", flat=True)), [role])
            self.assertNotIn(password, output.getvalue())
            self.assertNotIn("@", user.email)
        from apps.accounts.management.commands.create_role_samples import SUPER_SAMPLE

        username, password = SUPER_SAMPLE
        superuser = User.objects.get(username=username)
        self.assertTrue(superuser.is_superuser)
        self.assertFalse(superuser.is_staff)
        self.assertFalse(superuser.groups.exists())
        self.assertTrue(superuser.check_password(password))
        self.assertNotIn(password, output.getvalue())
