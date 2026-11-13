"""Nettoyage des termes de recherche agrégés (pas d'e-mail ni de téléphone)."""

import re
import unicodedata

EMAIL_RE = re.compile(r"[^\s]+@[^\s]+\.[^\s]+")
PHONE_RE = re.compile(r"(?:\+|00)?\d[\d\s().-]{6,}\d")
ALLOWED_RE = re.compile(r"[^\w\s\-']+", re.UNICODE)


def normalize_search_term(value):
    text = unicodedata.normalize("NFKC", str(value or "")).strip().lower()
    if len(text) < 2 or len(text) > 80:
        return ""
    if EMAIL_RE.search(text) or PHONE_RE.search(text):
        return ""
    cleaned = ALLOWED_RE.sub(" ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) < 2:
        return ""
    if cleaned.isdigit() and len(cleaned) >= 7:
        return ""
    return cleaned[:80]
