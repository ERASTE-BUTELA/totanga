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

ROLE_DESCRIPTIONS = {
    ROLE_ADMIN: "Accès complet au système.",
    ROLE_LIBRARIAN: "Gestion du catalogue (livres, exemplaires, auteurs, catégories).",
    ROLE_EDITOR: "Annonces, publications et événements.",
}

ROLE_ICONS = {
    ROLE_ADMIN: "crown",
    ROLE_LIBRARIAN: "book",
    ROLE_EDITOR: "pen",
}

ROLE_PRIORITY = (ROLE_ADMIN, ROLE_LIBRARIAN, ROLE_EDITOR)

ROLE_ACTIONS = ("view", "add", "change", "delete")

ROLE_MODULES = (
    ("dashboard", "Tableau de bord"),
    ("catalog", "Catalogue"),
    ("announcements", "Annonces"),
    ("publications", "Publications"),
    ("events", "Événements"),
    ("users", "Utilisateurs et rôles"),
    ("settings", "Paramètres"),
)

# Matrice module × action → permissions Django.
# Jamais delete_book : un livre s'archive, il ne se supprime pas.
MODULE_PERMISSIONS = {
    "dashboard": {
        "view": (),
        "add": (),
        "change": (),
        "delete": (),
    },
    "catalog": {
        "view": (
            ("catalog", "view_author"),
            ("catalog", "view_publisher"),
            ("catalog", "view_category"),
            ("catalog", "view_book"),
            ("catalog", "view_copy"),
        ),
        "add": (
            ("catalog", "add_author"),
            ("catalog", "add_publisher"),
            ("catalog", "add_category"),
            ("catalog", "add_book"),
            ("catalog", "add_copy"),
        ),
        "change": (
            ("catalog", "change_author"),
            ("catalog", "change_publisher"),
            ("catalog", "change_category"),
            ("catalog", "change_book"),
            ("catalog", "change_copy"),
        ),
        "delete": (
            ("catalog", "delete_author"),
            ("catalog", "delete_publisher"),
            ("catalog", "delete_category"),
            ("catalog", "delete_copy"),
        ),
    },
    "announcements": {
        "view": (("announcements", "view_announcement"),),
        "add": (("announcements", "add_announcement"),),
        "change": (("announcements", "change_announcement"),),
        "delete": (("announcements", "delete_announcement"),),
    },
    "publications": {
        "view": (("posts", "view_publication"),),
        "add": (("posts", "add_publication"),),
        "change": (("posts", "change_publication"),),
        "delete": (("posts", "delete_publication"),),
    },
    "events": {
        "view": (("events", "view_event"),),
        "add": (("events", "add_event"),),
        "change": (("events", "change_event"),),
        "delete": (),
    },
    "users": {
        "view": (
            ("accounts", "view_user"),
            ("accounts", "view_staffaction"),
            ("visitor_messages", "view_visitormessage"),
        ),
        "add": (("accounts", "add_user"),),
        "change": (("accounts", "change_user"),),
        "delete": (),
    },
    "settings": {
        "view": (
            ("library_info", "view_library"),
            ("analytics", "view_sitestat"),
        ),
        "add": (),
        "change": (("library_info", "change_library"),),
        "delete": (),
    },
}

DEFAULT_GRANTS = {
    ROLE_ADMIN: {
        "dashboard": {"view": True, "add": False, "change": False, "delete": False},
        "catalog": {"view": True, "add": True, "change": True, "delete": True},
        "announcements": {"view": True, "add": True, "change": True, "delete": True},
        "publications": {"view": True, "add": True, "change": True, "delete": True},
        "events": {"view": True, "add": True, "change": True, "delete": False},
        "users": {"view": True, "add": True, "change": True, "delete": False},
        "settings": {"view": True, "add": False, "change": True, "delete": False},
    },
    ROLE_LIBRARIAN: {
        "dashboard": {"view": True, "add": False, "change": False, "delete": False},
        "catalog": {"view": True, "add": True, "change": True, "delete": True},
        "announcements": {"view": False, "add": False, "change": False, "delete": False},
        "publications": {"view": False, "add": False, "change": False, "delete": False},
        "events": {"view": False, "add": False, "change": False, "delete": False},
        "users": {"view": False, "add": False, "change": False, "delete": False},
        "settings": {"view": False, "add": False, "change": False, "delete": False},
    },
    ROLE_EDITOR: {
        "dashboard": {"view": True, "add": False, "change": False, "delete": False},
        "catalog": {"view": False, "add": False, "change": False, "delete": False},
        "announcements": {"view": True, "add": True, "change": True, "delete": True},
        "publications": {"view": True, "add": True, "change": True, "delete": True},
        "events": {"view": True, "add": True, "change": True, "delete": False},
        "users": {"view": False, "add": False, "change": False, "delete": False},
        "settings": {"view": False, "add": False, "change": False, "delete": False},
    },
}

# L'administrateur doit garder la gestion des comptes (sinon plus personne ne peut corriger).
ADMIN_REQUIRED_GRANTS = {
    "users": ("view", "change"),
}


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


def blank_grants():
    return {
        module: {action: False for action in ROLE_ACTIONS}
        for module, _label in ROLE_MODULES
    }


def normalize_grants(raw):
    grants = blank_grants()
    if not isinstance(raw, dict):
        return grants
    for module, _label in ROLE_MODULES:
        row = raw.get(module)
        if not isinstance(row, dict):
            continue
        for action in ROLE_ACTIONS:
            if not MODULE_PERMISSIONS[module][action]:
                grants[module][action] = False
                continue
            grants[module][action] = bool(row.get(action))
    return grants


def permissions_from_grants(grants):
    pairs = []
    seen = set()
    for module, actions in normalize_grants(grants).items():
        for action, allowed in actions.items():
            if not allowed:
                continue
            for pair in MODULE_PERMISSIONS[module][action]:
                if pair in seen:
                    continue
                seen.add(pair)
                pairs.append(pair)
    return _permissions(pairs)


def grants_from_group(group):
    held = {
        (permission.content_type.app_label, permission.codename)
        for permission in group.permissions.select_related("content_type")
    }
    grants = blank_grants()
    for module, _label in ROLE_MODULES:
        for action in ROLE_ACTIONS:
            pairs = MODULE_PERMISSIONS[module][action]
            if not pairs:
                # Pas de droit Django dédié : le tableau de bord reste ouvert à tout le personnel.
                grants[module][action] = module == "dashboard" and action == "view"
                continue
            grants[module][action] = all(pair in held for pair in pairs)
    return grants


def apply_role_grants(code, grants):
    if code not in ROLE_PRIORITY:
        raise ValueError("Rôle inconnu.")
    grants = normalize_grants(grants)
    if code == ROLE_ADMIN:
        for module, actions in ADMIN_REQUIRED_GRANTS.items():
            for action in actions:
                if not grants[module][action]:
                    raise ValueError(
                        "L'administrateur doit garder la consultation et la modification des comptes."
                    )
    group, _created = Group.objects.get_or_create(name=code)
    group.permissions.set(permissions_from_grants(grants))
    return grants


def role_payload(code):
    group, _created = Group.objects.get_or_create(name=code)
    return {
        "code": code,
        "label": ROLE_LABELS[code],
        "description": ROLE_DESCRIPTIONS[code],
        "icon": ROLE_ICONS[code],
        "grants": grants_from_group(group),
    }


def list_role_payloads():
    return [role_payload(code) for code in ROLE_PRIORITY]


def sync_roles(*, reset=False):
    """Crée les trois groupes. Applique les droits par défaut à la création, ou si reset."""

    for code in ROLE_PRIORITY:
        group, created = Group.objects.get_or_create(name=code)
        if created or reset:
            group.permissions.set(permissions_from_grants(DEFAULT_GRANTS[code]))


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
