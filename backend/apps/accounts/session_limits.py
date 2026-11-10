"""Inactivité de 30 minutes et durée absolue de 10 heures.

La date de fin est une date fixe, pas un délai qui repart à chaque requête.
"""

from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth import logout
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

STARTED_KEY = "staff_session_started"
LAST_KEY = "staff_session_last"


def session_deadline(started):
    return started + timedelta(seconds=settings.STAFF_SESSION_MAX_SECONDS)


def stamp_session(session, now=None):
    now = now or timezone.now()
    session[STARTED_KEY] = now.isoformat()
    session[LAST_KEY] = now.isoformat()
    session.set_expiry(session_deadline(now))


def _parse(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


class StaffSessionLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self.limit(request)
        return self.get_response(request)

    def limit(self, request):
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return

        now = timezone.now()
        started = _parse(request.session.get(STARTED_KEY))
        last = _parse(request.session.get(LAST_KEY))
        if started is None or last is None:
            stamp_session(request.session, now)
            return

        idle = timedelta(seconds=settings.STAFF_SESSION_IDLE_SECONDS)
        absolute = timedelta(seconds=settings.STAFF_SESSION_MAX_SECONDS)
        if now - started > absolute or now - last > idle:
            request.staff_session_expired = True
            logout(request)
            request.user = AnonymousUser()
            return

        request.session[LAST_KEY] = now.isoformat()
        request.session.set_expiry(session_deadline(started))
