"""Intérêts catalogue (livres, catégories, recherches) sans double-compter les pages."""

import logging

from django.core.cache import cache
from django.utils import timezone

from .collect import _bump
from .fingerprint import daily_visitor_hash
from .models import DailyBookStat, DailyCategoryStat, DailySearchStat
from .robots import is_known_robot
from .searches import normalize_search_term

logger = logging.getLogger(__name__)


def _visitor_day_key(request):
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    if is_known_robot(user_agent):
        return None, None
    ip = request.META.get("REMOTE_ADDR") or ""
    day = timezone.localdate()
    visitor_hash = daily_visitor_hash(ip=ip, user_agent=user_agent, day=day)
    return visitor_hash, day


def note_book_consult(request, book):
    try:
        visitor_hash, day = _visitor_day_key(request)
        if not visitor_hash or book is None:
            return
        cache_key = f"analytics:book:{day}:{visitor_hash}:{book.pk}"
        if not cache.add(cache_key, 1, timeout=30):
            return
        title = str(book.title or "")[:255]
        _bump(DailyBookStat, day=day, book_id=book.pk, defaults={"title": title})
        if book.category_id:
            _bump(
                DailyCategoryStat,
                day=day,
                category_id=book.category_id,
                defaults={"name": str(book.category.name)[:120]},
            )
    except Exception:
        logger.exception("intérêt livre ignoré")


def note_category_consult(request, category):
    try:
        visitor_hash, day = _visitor_day_key(request)
        if not visitor_hash or category is None:
            return
        cache_key = f"analytics:cat:{day}:{visitor_hash}:{category.pk}"
        if not cache.add(cache_key, 1, timeout=30):
            return
        _bump(
            DailyCategoryStat,
            day=day,
            category_id=category.pk,
            defaults={"name": str(category.name)[:120]},
        )
    except Exception:
        logger.exception("intérêt catégorie ignoré")


def note_search(request, term):
    try:
        visitor_hash, day = _visitor_day_key(request)
        cleaned = normalize_search_term(term)
        if not visitor_hash or not cleaned:
            return
        cache_key = f"analytics:q:{day}:{visitor_hash}:{cleaned}"
        if not cache.add(cache_key, 1, timeout=30):
            return
        _bump(DailySearchStat, day=day, term=cleaned, defaults={})
    except Exception:
        logger.exception("intérêt recherche ignoré")
