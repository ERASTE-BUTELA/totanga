"""Groupes Django des trois rôles. Les droits sont vérifiés côté serveur."""

from django.contrib.auth.models import Group, Permission

ROLE_ADMIN = "administrateur"
ROLE_LIBRARIAN = "bibliothecaire"
ROLE_EDITOR = "redacteur"

ROLE_LABELS = {
    ROLE_ADMIN: "Administrateur",
    ROLE_LIBRARIAN: "Bibliothécaire",
    ROLE_EDITOR: "Rédacteur",
}

ROLE_PRIORITY = (ROLE_ADMIN, ROLE_LIBRARIAN, ROLE_EDITOR)

# Le livre ne se supprime pas : personne n'a delete_book.
LIBRARIAN_PERMISSIONS = (
    ("catalog", "view_author"),
    ("catalog", "add_author"),
    ("catalog", "change_author"),
    ("catalog", "delete_author"),
    ("catalog", "view_publisher"),
    ("catalog", "add_publisher"),
    ("catalog", "change_publisher"),
    ("catalog", "delete_publisher"),
    ("catalog", "view_category"),
    ("catalog", "add_category"),
    ("catalog", "change_category"),
    ("catalog", "delete_category"),
    ("catalog", "view_book"),
    ("catalog", "add_book"),
    ("catalog", "change_book"),
    ("catalog", "view_copy"),
    ("catalog", "add_copy"),
    ("catalog", "change_copy"),
    ("catalog", "delete_copy"),
)

# Le rédacteur prépare les annonces et les événements. Il ne les supprime pas :
# il les archive. Les publications viendront avec leur tranche.
EDITOR_PERMISSIONS = (
    ("announcements", "view_announcement"),
    ("announcements", "add_announcement"),
    ("announcements", "change_announcement"),
    ("events", "view_event"),
    ("events", "add_event"),
    ("events", "change_event"),
)

ADMIN_PERMISSIONS = (
    ("accounts", "view_user"),
    ("accounts", "add_user"),
    ("accounts", "change_user"),
    ("visitor_messages", "view_visitormessage"),
    ("accounts", "view_staffaction"),
    ("library_info", "view_library"),
    ("library_info", "change_library"),
)


def _permissions(pairs):
    found = []
    for app_label, codename in pairs:
        permission = Permission.objects.filter(
            content_type__app_label=app_label,
            codename=codename,
        ).first()
        if permission is None:
            raise RuntimeError(f"Permission absente : {app_label}.{codename}")
        found.append(permission)
    return found


def sync_roles():
    """Crée les trois groupes et aligne exactement leurs droits."""

    librarian = _permissions(LIBRARIAN_PERMISSIONS)
    editor = _permissions(EDITOR_PERMISSIONS)
    admin = librarian + editor + _permissions(ADMIN_PERMISSIONS)
    assigned = {
        ROLE_LIBRARIAN: librarian,
        ROLE_EDITOR: editor,
        ROLE_ADMIN: admin,
    }
    for name, permissions in assigned.items():
        group, _created = Group.objects.get_or_create(name=name)
        group.permissions.set(permissions)


def role_of(user):
    """Retourne (code, libellé). Le dépannage prime, puis le groupe le plus élevé."""

    if getattr(user, "is_superuser", False):
        return "depannage", "Super-administrateur"
    names = set(user.groups.values_list("name", flat=True))
    for code in ROLE_PRIORITY:
        if code in names:
            return code, ROLE_LABELS[code]
    return None, None


def can_enter_admin(user):
    if not user.is_active:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name__in=ROLE_PRIORITY).exists()
