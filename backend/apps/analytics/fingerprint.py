"""Empreinte quotidienne anonyme : jamais d'IP ni de navigateur en base."""

import hashlib
from datetime import date

from django.conf import settings


def daily_visitor_hash(*, ip, user_agent, day=None):
    """SHA-256(IP + UA + sel secret du jour). Seul le condensé est utilisable."""

    moment = day or date.today()
    material = "|".join(
        [
            str(settings.SECRET_KEY),
            "totanga-visite",
            moment.isoformat(),
            str(ip or ""),
            str(user_agent or ""),
        ]
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()
