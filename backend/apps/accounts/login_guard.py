"""Freine les essais de connexion sans dire si le compte existe.

La clé de cache mélange l'identifiant tenté et l'adresse de la requête.
Elle n'est pas écrite dans le journal.
"""

import hashlib

from django.conf import settings
from django.core.cache import cache


def _material(request, username):
    address = request.META.get("REMOTE_ADDR", "")
    return f"{username.strip().casefold()}|{address}"


def _key(request, username):
    digest = hashlib.sha256(_material(request, username).encode()).hexdigest()
    return f"staff-login:{digest}"


def is_locked(request, username):
    failures = cache.get(_key(request, username), 0)
    return failures >= settings.LOGIN_FAILURE_LIMIT


def note_failure(request, username):
    key = _key(request, username)
    window = settings.LOGIN_FAILURE_WINDOW_SECONDS
    if cache.add(key, 1, window):
        return
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, window)


def clear_failures(request, username):
    cache.delete(_key(request, username))
