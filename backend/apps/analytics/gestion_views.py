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


def _top(queryset, *, key, label_key, limit=8):
    rows = (
        queryset.values(key, label_key)
        .annotate(hits=Sum("hits"))
        .order_by("-hits")[:limit]
    )
    return [{"id": row[key], "label": row[label_key], "hits": row["hits"]} for row in rows]


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

        period = DailyTraffic.objects.filter(day__gte=start, day__lte=end)
        series = [
            {"day": row.day.isoformat(), "visits": row.visits, "unique_visitors": row.unique_visitors}
            for row in period.order_by("day")
        ]

        def window(from_day):
            qs = DailyTraffic.objects.filter(day__gte=from_day, day__lte=today)
            visits = int(qs.aggregate(total=Sum("visits"))["total"] or 0)
            # Uniques sur la fenêtre : empreintes encore présentes, sinon cumul journalier.
            uniques = (
                TrafficEvent.objects.filter(day__gte=from_day, day__lte=today)
                .values("visitor_hash")
                .distinct()
                .count()
            )
            if uniques == 0 and visits:
                uniques = int(qs.aggregate(total=Sum("unique_visitors"))["total"] or 0)
            return {"visits": visits, "unique_visitors": uniques}

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
                "geo_available": False,
                "geo_note": (
                    "Pays et ville non disponibles : aucune base géographique locale "
                    "et aucun service externe n'est autorisé."
                ),
                "totals": {
                    "period_visits": int(period.aggregate(total=Sum("visits"))["total"] or 0),
                    "period_unique_visitors": (
                        TrafficEvent.objects.filter(day__gte=start, day__lte=end)
                        .values("visitor_hash")
                        .distinct()
                        .count()
                        or int(period.aggregate(total=Sum("unique_visitors"))["total"] or 0)
                    ),
                    "today": window(today),
                    "week": window(week_start),
                    "month": window(month_start),
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
