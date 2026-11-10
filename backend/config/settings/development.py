"""Réglages de développement. DEBUG est toujours actif ici."""

from .base import *  # noqa: F403

DEBUG = True
ENABLE_DJANGO_ADMIN = True

CSRF_TRUSTED_ORIGINS = list(
    dict.fromkeys(
        [
            *CSRF_TRUSTED_ORIGINS,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    )
)
