import secrets
import string

from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import (
    ACTION_LOGIN,
    ACTION_LOGIN_REFUSED,
    ACTION_LOGOUT,
    ACTION_PASSWORD_CHANGE,
    ACTION_PASSWORD_RESET,
    ACTION_ROLES_UPDATED,
    ACTION_USER_CREATED,
    record_staff_action,
)
from .authentication import CsrfEnforcedAuthentication
from .login_guard import clear_failures, is_locked, note_failure
from .roles import (
    ROLE_ADMIN,
    ROLE_EDITOR,
    ROLE_LIBRARIAN,
    ROLE_PRIORITY,
    apply_role_grants,
    can_enter_admin,
    list_role_payloads,
    role_of,
)
from .session_limits import stamp_session

User = get_user_model()

REFUSED = "Identifiant ou mot de passe incorrect."
LOCKED = "Trop de tentatives de connexion. Réessayez plus tard."
MAX_PASSWORD_LENGTH = 256
STAFF_ROLES = (ROLE_ADMIN, ROLE_LIBRARIAN, ROLE_EDITOR)
PASSWORD_LENGTH = 20
PASSWORD_GROUPS = (
    string.ascii_lowercase,
    string.ascii_uppercase,
    string.digits,
    "-_@#",
)
_username_validator = UnicodeUsernameValidator()


def account_payload(user):
    code, label = role_of(user)
    name = user.get_full_name().strip() or user.get_username()
    return {
        "username": user.get_username(),
        "name": name,
        "role": code,
        "role_label": label,
        "permissions": sorted(user.get_all_permissions()),
        "joined": user.date_joined.isoformat(),
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


def _refused():
    record_staff_action(actor=None, action=ACTION_LOGIN_REFUSED)
    return Response({"detail": REFUSED}, status=401)


def _locked():
    return Response({"detail": LOCKED}, status=429)


def _draw_password():
    drawn = [secrets.choice(group) for group in PASSWORD_GROUPS]
    pool = "".join(PASSWORD_GROUPS)
    drawn.extend(secrets.choice(pool) for _ in range(PASSWORD_LENGTH - len(drawn)))
    for index in range(len(drawn) - 1, 0, -1):
        swap = secrets.randbelow(index + 1)
        drawn[index], drawn[swap] = drawn[swap], drawn[index]
    return "".join(drawn)


def generated_password(user):
    """Mot de passe aléatoire, contrôlé par les validateurs Django.

    Le texte n'est jamais journalisé. Il n'est renvoyé qu'une fois
    (création du compte ou réinitialisation par un administrateur).
    """

    for _ in range(20):
        password = _draw_password()
        try:
            validate_password(password, user=user)
        except ValidationError:
            continue
        return password
    return ""


def _clean_username(value):
    if not isinstance(value, str):
        return ""
    username = value.strip()
    if not username or len(username) > 150:
        return ""
    try:
        _username_validator(username)
    except ValidationError:
        return ""
    return username


def _clean_person_name(value):
    if not isinstance(value, str):
        return ""
    name = " ".join(value.split())
    if not name or len(name) > 150 or any(ord(character) < 32 for character in name):
        return ""
    return name


def _staff_row(person, password=""):
    row = {
        "id": person.pk,
        "username": person.get_username(),
        "name": person.get_full_name().strip() or person.get_username(),
        "role": role_of(person)[0],
        "active": person.is_active,
        "joined": person.date_joined.isoformat(),
    }
    if password:
        row["password"] = password
    return row


def _reject(request, username):
    note_failure(request, username)
    if is_locked(request, username):
        return _locked()
    return _refused()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        if getattr(request, "staff_session_expired", False):
            return Response({"detail": "Session expirée."}, status=401)
        if request.user.is_authenticated:
            return Response(account_payload(request.user))
        return Response(status=204)

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = request.data.get("password", "")
        password = password if isinstance(password, str) else ""
        if not username or not password:
            return Response({"detail": REFUSED}, status=401)
        if is_locked(request, username):
            return _locked()
        if len(password) > MAX_PASSWORD_LENGTH:
            return _reject(request, username)

        user = User.objects.filter(**{User.USERNAME_FIELD: username}).first()
        if user is None:
            User().set_password(password)
            return _reject(request, username)
        if not user.check_password(password) or not can_enter_admin(user):
            return _reject(request, username)

        clear_failures(request, username)
        login(request, user)
        stamp_session(request.session)
        record_staff_action(
            actor=user,
            action=ACTION_LOGIN,
            target_type="accounts.User",
            target_id=user.pk,
        )
        return Response(account_payload(user))

    def delete(self, request):
        if request.user.is_authenticated:
            record_staff_action(
                actor=request.user,
                action=ACTION_LOGOUT,
                target_type="accounts.User",
                target_id=request.user.pk,
            )
            logout(request)
        return Response(status=204)


class AccountView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(account_payload(request.user))


class AccountPasswordView(APIView):
    """Le personnel change son propre mot de passe, puis la session est fermée."""

    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        current = data.get("current_password", "")
        new_password = data.get("new_password", "")
        confirm = data.get("confirm_password", "")
        current = current if isinstance(current, str) else ""
        new_password = new_password if isinstance(new_password, str) else ""
        confirm = confirm if isinstance(confirm, str) else ""

        if not current or not new_password or not confirm:
            return Response(
                {"detail": "Indiquez l'ancien mot de passe et le nouveau (avec confirmation)."},
                status=400,
            )
        if len(current) > MAX_PASSWORD_LENGTH or len(new_password) > MAX_PASSWORD_LENGTH:
            return Response({"detail": "Le mot de passe est trop long."}, status=400)
        if not request.user.check_password(current):
            return Response({"detail": "L'ancien mot de passe est incorrect."}, status=400)
        if new_password != confirm:
            return Response({"detail": "La confirmation ne correspond pas au nouveau mot de passe."}, status=400)
        if new_password == current:
            return Response(
                {"detail": "Le nouveau mot de passe doit être différent de l'ancien."},
                status=400,
            )
        try:
            validate_password(new_password, user=request.user)
        except ValidationError:
            return Response(
                {
                    "detail": (
                        "Le nouveau mot de passe ne respecte pas les règles "
                        "(longueur, complexité, mots de passe trop courants)."
                    )
                },
                status=400,
            )

        user = request.user
        user.set_password(new_password)
        user.save(update_fields=["password"])
        record_staff_action(
            actor=user,
            action=ACTION_PASSWORD_CHANGE,
            target_type="accounts.User",
            target_id=user.pk,
        )
        logout(request)
        return Response({"ok": True, "detail": "Mot de passe modifié. Reconnectez-vous."})


class StaffUserListView(APIView):
    """Liste réservée au droit accounts.view_user. Aucune adresse électronique.

    La création exige accounts.add_user. Le mot de passe est généré ici
    et renvoyé une seule fois. La liste ne le contient jamais.
    """

    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm("accounts.view_user"):
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        people = User.objects.order_by(User.USERNAME_FIELD)
        return Response([_staff_row(person) for person in people])

    def post(self, request):
        if not request.user.has_perm("accounts.add_user"):
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        data = request.data if isinstance(request.data, dict) else {}
        username = _clean_username(data.get("username"))
        if not username:
            return Response({"detail": "Indiquez un identifiant valide."}, status=400)
        first_name = _clean_person_name(data.get("first_name"))
        last_name = _clean_person_name(data.get("last_name"))
        if not first_name or not last_name:
            return Response({"detail": "Indiquez le prénom et le nom."}, status=400)
        role = data.get("role")
        if role not in STAFF_ROLES:
            return Response({"detail": "Choisissez un rôle du personnel."}, status=400)
        if User.objects.filter(**{User.USERNAME_FIELD: username}).exists():
            return Response({"detail": "Cet identifiant est déjà utilisé."}, status=409)

        candidate = User(username=username, first_name=first_name, last_name=last_name)
        password = generated_password(candidate)
        if not password:
            return Response({"detail": "Le compte n'a pas pu être créé. Réessayez."}, status=400)
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    email="",
                    is_staff=False,
                    is_superuser=False,
                )
                user.groups.set([Group.objects.get(name=role)])
        except IntegrityError:
            return Response({"detail": "Cet identifiant est déjà utilisé."}, status=409)

        record_staff_action(
            actor=request.user,
            action=ACTION_USER_CREATED,
            target_type="accounts.User",
            target_id=user.pk,
        )
        return Response(_staff_row(user, password), status=201)


class StaffPasswordResetView(APIView):
    """Réinitialise le mot de passe d'un compte. Réservé à accounts.change_user.

    Le nouveau mot de passe est généré ici et renvoyé une seule fois.
    """

    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if not request.user.has_perm("accounts.change_user"):
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        person = User.objects.filter(pk=user_id).first()
        if person is None:
            return Response({"detail": "Ce compte n'existe pas."}, status=404)
        if person.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        password = generated_password(person)
        if not password:
            return Response(
                {"detail": "Le mot de passe n'a pas pu être généré. Réessayez."},
                status=400,
            )
        person.set_password(password)
        person.save(update_fields=["password"])
        record_staff_action(
            actor=request.user,
            action=ACTION_PASSWORD_RESET,
            target_type="accounts.User",
            target_id=person.pk,
        )
        return Response(_staff_row(person, password))


class StaffRoleListView(APIView):
    """Lecture et enregistrement des droits des trois rôles du personnel."""

    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm("accounts.view_user"):
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        return Response({"roles": list_role_payloads()})

    def put(self, request):
        if not request.user.has_perm("accounts.change_user"):
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        data = request.data if isinstance(request.data, dict) else {}
        rows = data.get("roles")
        if not isinstance(rows, list) or not rows:
            return Response({"detail": "Indiquez les rôles à enregistrer."}, status=400)
        by_code = {}
        for row in rows:
            if not isinstance(row, dict):
                return Response({"detail": "Indiquez les rôles à enregistrer."}, status=400)
            code = row.get("code")
            if code not in ROLE_PRIORITY:
                return Response({"detail": "Un rôle demandé n'existe pas."}, status=400)
            if code in by_code:
                return Response({"detail": "Chaque rôle ne peut apparaître qu'une fois."}, status=400)
            by_code[code] = row.get("grants")
        missing = [code for code in ROLE_PRIORITY if code not in by_code]
        if missing:
            return Response({"detail": "Tous les rôles doivent être envoyés ensemble."}, status=400)
        try:
            with transaction.atomic():
                for code in ROLE_PRIORITY:
                    apply_role_grants(code, by_code[code])
        except ValueError as error:
            return Response({"detail": str(error)}, status=400)
        except RuntimeError:
            return Response({"detail": "Les rôles n'ont pas pu être enregistrés. Réessayez."}, status=400)
        record_staff_action(
            actor=request.user,
            action=ACTION_ROLES_UPDATED,
            target_type="auth.Group",
            target_id="",
        )
        return Response({"roles": list_role_payloads()})


class StaffJournalView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm("accounts.view_staffaction"):
            return Response({"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."}, status=403)
        from .models import StaffAction

        rows = []
        for action in StaffAction.objects.select_related("actor").order_by("-created_at")[:100]:
            rows.append(
                {
                    "id": action.pk,
                    "action": action.action,
                    "target_type": action.target_type,
                    "target_id": action.target_id,
                    "created_at": action.created_at.isoformat(),
                    "actor": action.actor.get_username() if action.actor_id else "",
                }
            )
        return Response(rows)


class DashboardView(APIView):
    """Chiffres réels du tableau de bord (personnel connecté)."""

    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count
        from django.utils import timezone

        from apps.announcements.models import Announcement, AnnouncementState
        from apps.catalog.models import Book, Copy, CopyStatus
        from apps.events.models import Event, EventState
        from .models import StaffAction

        now = timezone.now()
        available = Copy.objects.filter(status=CopyStatus.AVAILABLE).count()
        copies_by_status = {
            row["status"]: row["total"]
            for row in Copy.objects.values("status").annotate(total=Count("id"))
        }
        copy_rows = []
        for code, label in CopyStatus.choices:
            copy_rows.append({"code": code, "label": label, "count": int(copies_by_status.get(code, 0))})

        announcements_published = Announcement.objects.filter(state=AnnouncementState.PUBLISHED).count()
        announcements_draft = Announcement.objects.filter(state=AnnouncementState.DRAFT).count()
        events_published = Event.objects.filter(state=EventState.PUBLISHED).count()
        events_draft = Event.objects.filter(state=EventState.DRAFT).count()
        events_upcoming = Event.objects.filter(
            state=EventState.PUBLISHED,
            starts_at__gte=now,
        ).count()
        drafts_total = (
            announcements_draft
            + events_draft
            + Book.objects.filter(state="draft").count()
        )

        activity = []
        if request.user.has_perm("accounts.view_staffaction"):
            for action in StaffAction.objects.select_related("actor").order_by("-created_at")[:8]:
                name = ""
                if action.actor_id:
                    name = action.actor.get_full_name().strip() or action.actor.get_username()
                activity.append(
                    {
                        "id": action.pk,
                        "actor": name or "—",
                        "action": action.action,
                        "target_type": action.target_type,
                        "target_id": action.target_id,
                        "created_at": action.created_at.isoformat(),
                    }
                )

        return Response(
            {
                "books": Book.objects.count(),
                "copies_available": available,
                "copies_unavailable": Copy.objects.count() - available,
                "announcements_published": announcements_published,
                "events_upcoming": events_upcoming,
                "drafts": drafts_total,
                "copies": copy_rows,
                "statuses": [
                    {
                        "label": "Annonces",
                        "published": announcements_published,
                        "draft": announcements_draft,
                    },
                    {
                        "label": "Événements",
                        "published": events_published,
                        "draft": events_draft,
                    },
                ],
                "activity": activity,
            }
        )


class StaffMessageListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm("visitor_messages.view_visitormessage"):
            return Response({"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."}, status=403)
        from apps.visitor_messages.models import VisitorMessage
        from apps.visitor_messages.staff_serializers import serialize_message

        rows = [
            serialize_message(message)
            for message in VisitorMessage.objects.prefetch_related("replies").order_by("-created_at")[:100]
        ]
        return Response(
            {
                "results": rows,
                "unread_count": VisitorMessage.objects.filter(is_read=False).count(),
            }
        )

    def patch(self, request):
        """Marquer un message ou tous les messages comme lus (personnel uniquement)."""
        if not request.user.has_perm("visitor_messages.view_visitormessage"):
            return Response({"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."}, status=403)
        from apps.visitor_messages.models import VisitorMessage

        mark_all = bool(request.data.get("mark_all"))
        if mark_all:
            updated = VisitorMessage.objects.filter(is_read=False).update(is_read=True)
            return Response({"ok": True, "updated": updated, "unread_count": 0})

        raw_id = request.data.get("id")
        try:
            message_id = int(raw_id)
        except (TypeError, ValueError):
            return Response({"detail": "Indiquez le message à marquer comme lu."}, status=400)
        message = VisitorMessage.objects.filter(pk=message_id).first()
        if message is None:
            return Response({"detail": "Ce message n'existe pas."}, status=404)
        if not message.is_read:
            message.is_read = True
            message.save(update_fields=["is_read"])
        return Response(
            {
                "ok": True,
                "id": message.pk,
                "is_read": True,
                "unread_count": VisitorMessage.objects.filter(is_read=False).count(),
            }
        )
