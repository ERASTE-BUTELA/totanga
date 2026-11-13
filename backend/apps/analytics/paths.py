"""Chemins publics acceptés pour la fréquentation."""

from urllib.parse import urlparse

ALLOWED_PREFIXES = (
    "/catalogue",
    "/annonces",
    "/publications",
    "/evenements",
    "/a-propos",
)

PAGE_LABELS = {
    "/": "Accueil",
    "/catalogue": "Catalogue",
    "/annonces": "Annonces",
    "/publications": "Publications",
    "/evenements": "Événements",
    "/a-propos": "À propos",
}


def normalize_public_path(value):
    raw = str(value or "").strip()
    if not raw:
        return ""
    if "://" in raw or raw.startswith("//"):
        parsed = urlparse(raw if "://" in raw else f"https:{raw}")
        raw = parsed.path or "/"
    if "?" in raw:
        raw = raw.split("?", 1)[0]
    if "#" in raw:
        raw = raw.split("#", 1)[0]
    if not raw.startswith("/") or "\\" in raw or ".." in raw:
        return ""
    if any(ord(char) < 32 for char in raw):
        return ""
    if len(raw) > 200:
        raw = raw[:200]
    if raw != "/" and raw.endswith("/"):
        raw = raw.rstrip("/")
    if raw == "/":
        return "/"
    for prefix in ALLOWED_PREFIXES:
        if raw == prefix or raw.startswith(f"{prefix}/"):
            return raw
    return ""


def page_label(path):
    path = normalize_public_path(path) or path
    if path in PAGE_LABELS:
        return PAGE_LABELS[path]
    for prefix, label in PAGE_LABELS.items():
        if prefix != "/" and (path == prefix or path.startswith(f"{prefix}/")):
            if path.startswith("/catalogue/livres/"):
                return "Fiche livre"
            if path.startswith("/catalogue"):
                return "Catalogue"
            if path.startswith("/annonces/"):
                return "Annonce"
            if path.startswith("/publications/"):
                return "Publication"
            if path.startswith("/evenements/"):
                return "Événement"
            return label
    return path or "Page"


def page_kind(path):
    path = normalize_public_path(path) or ""
    if path == "/":
        return "home"
    if path.startswith("/catalogue/livres/"):
        return "book"
    if path.startswith("/catalogue"):
        return "catalog"
    if path.startswith("/annonces"):
        return "announcement"
    if path.startswith("/publications"):
        return "publication"
    if path.startswith("/evenements"):
        return "event"
    if path.startswith("/a-propos"):
        return "about"
    return "other"
