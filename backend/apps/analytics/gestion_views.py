"""API d'administration des statistiques de fréquentation."""

from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication

from .classify import DEVICE_LABELS, ORIGIN_LABELS
from .models import (
    DailyBookStat,
    DailyCategoryStat,
    DailyDeviceStat,
    DailyOriginStat,
    DailyPageStat,
    DailySearchStat,
    DailyTraffic,
    TrafficEvent,
)


def _can_view_stats(user):
    if getattr(user, "is_superuser", False):
        return True
    return user.has_perm("analytics.view_sitestat")


def _parse_bounds(request):
    today = timezone.localdate()
    raw_from = parse_date(str(request.GET.get("from", "")).strip()) if request.GET.get("from") else None
    raw_to = parse_date(str(request.GET.get("to", "")).strip()) if request.GET.get("to") else None
    end = raw_to or today
    start = raw_from or (end - timedelta(days=29))
    if start > end:
        start, end = end, start
    if (end - start).days > 366:
        start = end - timedelta(days=365)
    return start, end


def _pages_per_visit(page_views, visits):
    if not visits:
        return 0
    return round(page_views / visits, 1)


def _bundle(visitors, visits, page_views):
    return {
        "visitors": visitors,
        "visits": visits,
        "page_views": page_views,
        "pages_per_visit": _pages_per_visit(page_views, visits),
    }


def _top(queryset, *, key, label_key, limit=8):
    rows = (
        queryset.values(key, label_key)
        .annotate(hits=Sum("hits"))
        .order_by("-hits")[:limit]
    )
    return [{"id": row[key], "label": row[label_key], "hits": row["hits"]} for row in rows]


def _window_totals(from_day, to_day):
    qs = DailyTraffic.objects.filter(day__gte=from_day, day__lte=to_day)
    totals = qs.aggregate(
        visitors=Sum("visitors"),
        visits=Sum("visits"),
        page_views=Sum("page_views"),
    )
    visitors = int(totals["visitors"] or 0)
    visits = int(totals["visits"] or 0)
    page_views = int(totals["page_views"] or 0)
    # Sur la fenêtre, préférer les empreintes encore présentes pour les visiteurs.
    live_visitors = (
        TrafficEvent.objects.filter(day__gte=from_day, day__lte=to_day)
        .values("visitor_hash")
        .distinct()
        .count()
    )
    if live_visitors:
        visitors = live_visitors
    return _bundle(visitors, visits, page_views)


class SiteStatisticsView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _can_view_stats(request.user):
            return Response({"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."}, status=403)

        start, end = _parse_bounds(request)
        today = timezone.localdate()
        week_start = today - timedelta(days=6)
        month_start = today - timedelta(days=29)

        period_rows = DailyTraffic.objects.filter(day__gte=start, day__lte=end).order_by("day")
        series = [
            {
                "day": row.day.isoformat(),
                "visitors": row.visitors,
                "visits": row.visits,
                "page_views": row.page_views,
            }
            for row in period_rows
        ]
        period = _window_totals(start, end)

        pages = (
            DailyPageStat.objects.filter(day__gte=start, day__lte=end)
            .values("path", "label")
            .annotate(hits=Sum("hits"))
            .order_by("-hits")[:10]
        )
        searches = (
            DailySearchStat.objects.filter(day__gte=start, day__lte=end)
            .values("term")
            .annotate(hits=Sum("hits"))
            .order_by("-hits")[:15]
        )
        devices = (
            DailyDeviceStat.objects.filter(day__gte=start, day__lte=end)
            .values("device")
            .annotate(hits=Sum("hits"))
            .order_by("-hits")
        )
        origins = (
            DailyOriginStat.objects.filter(day__gte=start, day__lte=end)
            .values("origin")
            .annotate(hits=Sum("hits"))
            .order_by("-hits")
        )

        return Response(
            {
                "from": start.isoformat(),
                "to": end.isoformat(),
                "definitions": {
                    "visitors": "Empreinte quotidienne distincte, comptée une fois par jour.",
                    "visits": "Séjour continu ; une nouvelle visite après 30 minutes sans activité, ou le lendemain.",
                    "page_views": "Chaque page ouverte (changements de page inclus), hors rechargements instantanés et robots.",
                },
                "geo_available": False,
                "geo_note": (
                    "Pays et ville non disponibles : aucune base géographique locale "
                    "et aucun service externe n'est autorisé."
                ),
                "totals": {
                    "period": period,
                    "today": _window_totals(today, today),
                    "week": _window_totals(week_start, today),
                    "month": _window_totals(month_start, today),
                },
                "series": series,
                "top_pages": [{"path": row["path"], "label": row["label"], "hits": row["hits"]} for row in pages],
                "top_books": _top(
                    DailyBookStat.objects.filter(day__gte=start, day__lte=end),
                    key="book_id",
                    label_key="title",
                ),
                "top_categories": _top(
                    DailyCategoryStat.objects.filter(day__gte=start, day__lte=end),
                    key="category_id",
                    label_key="name",
                ),
                "top_searches": [{"term": row["term"], "hits": row["hits"]} for row in searches],
                "devices": [
                    {"id": row["device"], "label": DEVICE_LABELS.get(row["device"], row["device"]), "hits": row["hits"]}
                    for row in devices
                ],
                "origins": [
                    {"id": row["origin"], "label": ORIGIN_LABELS.get(row["origin"], row["origin"]), "hits": row["hits"]}
                    for row in origins
                ],
            }
        )
