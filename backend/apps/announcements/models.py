"""Annonces affichées au public pendant une période."""

from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.catalog.models import StoredImage
from apps.common.slugs import unique_slug

KINSHASA = ZoneInfo("Africa/Kinshasa")


class AnnouncementCategory(models.TextChoices):
    GENERAL = "informations", "Informations générales"
    ACQUISITIONS = "acquisitions", "Nouvelles acquisitions"
    HOURS = "horaires", "Horaires et services"
    MAINTENANCE = "maintenance", "Maintenance et travaux"


class AnnouncementState(models.TextChoices):
    DRAFT = "draft", "Brouillon"
    PUBLISHED = "published", "Publié"
    ARCHIVED = "archived", "Archivé"


class Announcement(models.Model):
    title = models.CharField("titre", max_length=255)
    slug = models.SlugField("adresse", max_length=255, unique=True, editable=False)
    category = models.CharField(
        "catégorie",
        max_length=20,
        choices=AnnouncementCategory.choices,
    )
    important = models.BooleanField("importante", default=False)
    image = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="announcements",
        verbose_name="image",
    )
    body = models.TextField("texte")
    state = models.CharField(
        "état",
        max_length=20,
        choices=AnnouncementState.choices,
        default=AnnouncementState.DRAFT,
    )
    published_at = models.DateTimeField("date de publication")
    effective_on = models.DateField("date d'effet", null=True, blank=True)
    display_until = models.DateField("fin d'affichage", null=True, blank=True)
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    updated_at = models.DateTimeField("modifiée le", auto_now=True)

    class Meta:
        verbose_name = "annonce"
        verbose_name_plural = "annonces"
        ordering = ["-published_at", "title"]
        indexes = [models.Index(fields=["state", "-published_at"])]

    def __str__(self):
        return self.title

    def clean(self):
        if not str(self.body or "").strip():
            raise ValidationError({"body": "Le texte est obligatoire."})
        if self.display_until and self.published_at:
            published_day = timezone.localtime(self.published_at, KINSHASA).date()
            if self.display_until < published_day:
                raise ValidationError(
                    {"display_until": "La fin d'affichage ne peut pas précéder le jour de publication."}
                )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(type(self), self.title, max_length=255, instance=self)
        self.full_clean()
        super().save(*args, **kwargs)


def visible_announcements(moment=None):
    moment = moment or timezone.now()
    today = timezone.localtime(moment, KINSHASA).date()
    return Announcement.objects.filter(state=AnnouncementState.PUBLISHED, published_at__lte=moment).filter(
        Q(display_until__isnull=True) | Q(display_until__gte=today)
    )
