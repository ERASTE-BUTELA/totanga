"""Fréquentation anonyme du site public.

Les événements détaillés portent une empreinte quotidienne (jamais l'IP).
Les compteurs agrégés survivent à la purge des événements (90 jours).
"""

from datetime import timedelta

from django.db import models
from django.utils import timezone

RETENTION_DAYS = 90


class TrafficEvent(models.Model):
    """Événement détaillé, purgé après 90 jours. Aucune IP, aucun UA."""

    day = models.DateField("jour", db_index=True)
    visitor_hash = models.CharField("empreinte du jour", max_length=64, db_index=True)
    path = models.CharField("chemin", max_length=200)
    page_kind = models.CharField("type de page", max_length=40, default="other")
    book_id = models.PositiveIntegerField("livre", null=True, blank=True)
    book_title = models.CharField("titre du livre", max_length=255, blank=True, default="")
    category_id = models.PositiveIntegerField("catégorie", null=True, blank=True)
    category_name = models.CharField("nom de catégorie", max_length=120, blank=True, default="")
    search_term = models.CharField("recherche", max_length=80, blank=True, default="")
    device = models.CharField("appareil", max_length=20, default="other")
    origin = models.CharField("origine", max_length=20, default="direct")
    created_at = models.DateTimeField("vu le", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "événement de fréquentation"
        verbose_name_plural = "événements de fréquentation"
        ordering = ["-created_at"]
        default_permissions = ()
        permissions = [("view_sitestat", "Peut consulter les statistiques du site")]
        indexes = [
            models.Index(fields=["day", "visitor_hash"]),
            models.Index(fields=["day", "path"]),
        ]

    def __str__(self):
        return f"{self.path} @ {self.created_at}"


class DailyTraffic(models.Model):
    day = models.DateField("jour", unique=True)
    visitors = models.PositiveIntegerField("visiteurs", default=0)
    visits = models.PositiveIntegerField("visites", default=0)
    page_views = models.PositiveIntegerField("pages vues", default=0)

    class Meta:
        verbose_name = "trafic journalier"
        verbose_name_plural = "trafics journaliers"
        ordering = ["-day"]
        default_permissions = ()


class DailyPageStat(models.Model):
    day = models.DateField("jour", db_index=True)
    path = models.CharField("chemin", max_length=200)
    label = models.CharField("libellé", max_length=120)
    hits = models.PositiveIntegerField("vues", default=0)

    class Meta:
        verbose_name = "page journalière"
        verbose_name_plural = "pages journalières"
        ordering = ["-day", "-hits"]
        default_permissions = ()
        constraints = [models.UniqueConstraint(fields=["day", "path"], name="analytics_dailypage_day_path")]


class DailyBookStat(models.Model):
    day = models.DateField("jour", db_index=True)
    book_id = models.PositiveIntegerField("livre")
    title = models.CharField("titre", max_length=255)
    hits = models.PositiveIntegerField("vues", default=0)

    class Meta:
        verbose_name = "livre journalier"
        verbose_name_plural = "livres journaliers"
        ordering = ["-day", "-hits"]
        default_permissions = ()
        constraints = [models.UniqueConstraint(fields=["day", "book_id"], name="analytics_dailybook_day_book")]


class DailyCategoryStat(models.Model):
    day = models.DateField("jour", db_index=True)
    category_id = models.PositiveIntegerField("catégorie")
    name = models.CharField("nom", max_length=120)
    hits = models.PositiveIntegerField("vues", default=0)

    class Meta:
        verbose_name = "catégorie journalière"
        verbose_name_plural = "catégories journalières"
        ordering = ["-day", "-hits"]
        default_permissions = ()
        constraints = [
            models.UniqueConstraint(fields=["day", "category_id"], name="analytics_dailycat_day_cat")
        ]


class DailySearchStat(models.Model):
    day = models.DateField("jour", db_index=True)
    term = models.CharField("terme", max_length=80)
    hits = models.PositiveIntegerField("occurrences", default=0)

    class Meta:
        verbose_name = "recherche journalière"
        verbose_name_plural = "recherches journalières"
        ordering = ["-day", "-hits"]
        default_permissions = ()
        constraints = [models.UniqueConstraint(fields=["day", "term"], name="analytics_dailysearch_day_term")]


class DailyDeviceStat(models.Model):
    day = models.DateField("jour", db_index=True)
    device = models.CharField("appareil", max_length=20)
    hits = models.PositiveIntegerField("vues", default=0)

    class Meta:
        verbose_name = "appareil journalier"
        verbose_name_plural = "appareils journaliers"
        ordering = ["-day", "-hits"]
        default_permissions = ()
        constraints = [models.UniqueConstraint(fields=["day", "device"], name="analytics_dailydevice_day_dev")]


class DailyOriginStat(models.Model):
    day = models.DateField("jour", db_index=True)
    origin = models.CharField("origine", max_length=20)
    hits = models.PositiveIntegerField("vues", default=0)

    class Meta:
        verbose_name = "origine journalière"
        verbose_name_plural = "origines journalières"
        ordering = ["-day", "-hits"]
        default_permissions = ()
        constraints = [models.UniqueConstraint(fields=["day", "origin"], name="analytics_dailyorigin_day_ori")]


def purge_old_events(*, now=None):
    moment = now or timezone.now()
    cutoff = moment - timedelta(days=RETENTION_DAYS)
    deleted, _ = TrafficEvent.objects.filter(created_at__lt=cutoff).delete()
    return deleted
