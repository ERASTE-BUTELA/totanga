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
    ACTION_USER_CREATED,
    record_staff_action,
)
from .authentication import CsrfEnforcedAuthentication
from .login_guard import clear_failures, is_locked, note_failure
from .roles import ROLE_ADMIN, ROLE_EDITOR, ROLE_LIBRARIAN, can_enter_admin, role_of
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

    Le texte n'est jamais journalisé. Il n'est renvoyé qu'une fois, à la création.
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


class StaffMessageListView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm("visitor_messages.view_visitormessage"):
            return Response({"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."}, status=403)
        from apps.visitor_messages.models import VisitorMessage

        rows = []
        for message in VisitorMessage.objects.order_by("-created_at")[:100]:
            rows.append(
                {
                    "id": message.pk,
                    "name": message.name,
                    "email": message.email,
                    "subject": message.get_subject_display(),
                    "body": message.body,
                    "created_at": message.created_at.isoformat(),
                }
            )
        return Response(rows)
