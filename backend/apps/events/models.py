"""Événements de la bibliothèque."""

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.catalog.models import StoredImage
from apps.common.links import http_url
from apps.common.slugs import unique_slug


class EventType(models.TextChoices):
    CONFERENCE = "conference", "Conférence"
    WORKSHOP = "atelier", "Atelier"
    MEETING = "rencontre", "Rencontre littéraire"
    FAIR = "salon", "Salon"
    EXHIBITION = "exposition", "Exposition"
    READING = "lecture", "Lecture"


class EventState(models.TextChoices):
    DRAFT = "draft", "Brouillon"
    PUBLISHED = "published", "Publié"
    ARCHIVED = "archived", "Archivé"


class Event(models.Model):
    title = models.CharField("titre", max_length=255)
    slug = models.SlugField("adresse", max_length=255, unique=True, editable=False)
    summary = models.TextField("résumé")
    event_type = models.CharField("type", max_length=20, choices=EventType.choices)
    starts_at = models.DateTimeField("début")
    ends_at = models.DateTimeField("fin")
    location = models.CharField("lieu", max_length=200)
    image = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="events",
        verbose_name="image",
    )
    audience = models.CharField("public visé", max_length=200, blank=True)
    capacity = models.PositiveIntegerField("nombre de places", null=True, blank=True)
    registration_url = models.CharField("lien d'inscription", max_length=500, blank=True)
    programme = models.TextField(
        "programme",
        blank=True,
        help_text="Un point par ligne.",
    )
    state = models.CharField(
        "état",
        max_length=20,
        choices=EventState.choices,
        default=EventState.DRAFT,
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "événement"
        verbose_name_plural = "événements"
        ordering = ["starts_at", "title"]
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__gt=models.F("starts_at")),
                name="events_end_after_start",
            ),
        ]
        indexes = [models.Index(fields=["state", "starts_at"])]

    def __str__(self):
        return self.title

    def clean(self):
        if not str(self.summary or "").strip():
            raise ValidationError({"summary": "Le résumé est obligatoire."})
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "La fin doit être après le début."})
        self.registration_url = http_url(self.registration_url)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(type(self), self.title, max_length=255, instance=self)
        self.full_clean()
        super().save(*args, **kwargs)


class Speaker(models.Model):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="speakers",
        verbose_name="événement",
    )
    name = models.CharField("nom", max_length=200)
    title = models.CharField("titre", max_length=200, blank=True)
    photo = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="speakers",
        verbose_name="photo",
    )
    position = models.PositiveSmallIntegerField("ordre")

    class Meta:
        verbose_name = "intervenant"
        verbose_name_plural = "intervenants"
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["event", "position"], name="events_speaker_order"),
            models.CheckConstraint(
                condition=Q(position__gte=1, position__lte=5),
                name="events_speaker_position",
            ),
        ]

    def __str__(self):
        return self.name
