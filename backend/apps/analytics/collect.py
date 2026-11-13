"""Collecte légère : jamais bloquante pour l'appelant (exceptions avalées)."""

import logging
import random
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .classify import classify_device, classify_origin
from .fingerprint import daily_visitor_hash
from .models import (
    DailyBookStat,
    DailyCategoryStat,
    DailyDeviceStat,
    DailyOriginStat,
    DailyPageStat,
    DailySearchStat,
    DailyTraffic,
    TrafficEvent,
    purge_old_events,
)
from .paths import normalize_public_path, page_kind, page_label
from .robots import is_known_robot
from .searches import normalize_search_term

logger = logging.getLogger(__name__)

DEDUP_SECONDS = 20


def _site_hosts():
    hosts = []
    for item in getattr(settings, "ALLOWED_HOSTS", []) or []:
        if item and item != "*":
            hosts.append(item)
    for item in getattr(settings, "CSRF_TRUSTED_ORIGINS", []) or []:
        try:
            from urllib.parse import urlparse

            host = urlparse(item).hostname
            if host:
                hosts.append(host)
        except Exception:
            continue
    return tuple(hosts)


def _bump(model, *, defaults, **lookup):
    updated = model.objects.filter(**lookup).update(hits=F("hits") + 1)
    if updated:
        return
    try:
        model.objects.create(**lookup, **defaults, hits=1)
    except Exception:
        model.objects.filter(**lookup).update(hits=F("hits") + 1)


def record_public_hit(
    request,
    *,
    path="",
    referrer="",
    book_id=None,
    book_title="",
    category_id=None,
    category_name="",
    search="",
):
    """Enregistre une visite anonyme. Ne lève jamais d'exception vers l'appelant."""

    try:
        _record(
            request,
            path=path,
            referrer=referrer,
            book_id=book_id,
            book_title=book_title,
            category_id=category_id,
            category_name=category_name,
            search=search,
        )
    except Exception:
        logger.exception("collecte fréquentation ignorée")


def _record(request, *, path, referrer, book_id, book_title, category_id, category_name, search):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    if is_known_robot(user_agent):
        return
    clean_path = normalize_public_path(path or getattr(request, "path", ""))
    if not clean_path:
        return

    ip = request.META.get("REMOTE_ADDR") or ""
    now = timezone.now()
    day = timezone.localtime(now).date()
    visitor_hash = daily_visitor_hash(ip=ip, user_agent=user_agent, day=day)
    # L'IP et le UA ne quittent pas cette fonction.

    recent = TrafficEvent.objects.filter(
        visitor_hash=visitor_hash,
        path=clean_path,
        created_at__gte=now - timedelta(seconds=DEDUP_SECONDS),
    ).exists()
    if recent:
        return

    device = classify_device(user_agent)
    origin = classify_origin(referrer or request.META.get("HTTP_REFERER", ""), site_hosts=_site_hosts())
    term = normalize_search_term(search)
    kind = page_kind(clean_path)
    label = page_label(clean_path)

    try:
        book_pk = int(book_id) if book_id not in (None, "", 0, "0") else None
    except (TypeError, ValueError):
        book_pk = None
    try:
        category_pk = int(category_id) if category_id not in (None, "", 0, "0") else None
    except (TypeError, ValueError):
        category_pk = None
    title = str(book_title or "")[:255]
    cat_name = str(category_name or "")[:120]

    first_today = not TrafficEvent.objects.filter(day=day, visitor_hash=visitor_hash).exists()

    with transaction.atomic():
        TrafficEvent.objects.create(
            day=day,
            visitor_hash=visitor_hash,
            path=clean_path,
            page_kind=kind,
            book_id=book_pk,
            book_title=title,
            category_id=category_pk,
            category_name=cat_name,
            search_term=term,
            device=device,
            origin=origin,
        )
        traffic, _ = DailyTraffic.objects.get_or_create(day=day, defaults={"visits": 0, "unique_visitors": 0})
        DailyTraffic.objects.filter(pk=traffic.pk).update(
            visits=F("visits") + 1,
            unique_visitors=F("unique_visitors") + (1 if first_today else 0),
        )
        _bump(DailyPageStat, day=day, path=clean_path, defaults={"label": label})
        _bump(DailyDeviceStat, day=day, device=device, defaults={})
        _bump(DailyOriginStat, day=day, origin=origin, defaults={})
        if book_pk and title:
            _bump(DailyBookStat, day=day, book_id=book_pk, defaults={"title": title})
        if category_pk and cat_name:
            _bump(DailyCategoryStat, day=day, category_id=category_pk, defaults={"name": cat_name})
        if term:
            _bump(DailySearchStat, day=day, term=term, defaults={})

    if random.random() < 0.05:
        purge_old_events(now=now)
