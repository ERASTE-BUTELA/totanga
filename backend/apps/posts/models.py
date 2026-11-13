"""Publications rédigées par le personnel, visibles sur le site public."""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.catalog.models import StoredImage
from apps.common.slugs import unique_slug


class PublicationCategory(models.TextChoices):
    CULTURE = "Culture", "Culture"
    NEWS = "Actualité", "Actualité"
    TIPS = "Conseils", "Conseils"
    EVENT = "Événement", "Événement"
    TECH = "Technologie", "Technologie"


class PublicationState(models.TextChoices):
    DRAFT = "draft", "Brouillon"
    PUBLISHED = "published", "Publié"
    ARCHIVED = "archived", "Archivé"


class Publication(models.Model):
    title = models.CharField("titre", max_length=255)
    slug = models.SlugField("adresse", max_length=255, unique=True, editable=False)
    category = models.CharField(
        "catégorie",
        max_length=40,
        choices=PublicationCategory.choices,
        default=PublicationCategory.CULTURE,
    )
    author_name = models.CharField("rédacteur", max_length=200, default="Équipe Totanga")
    excerpt = models.CharField("résumé", max_length=250)
    content = models.TextField("contenu")
    image = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="publications",
        verbose_name="image",
    )
    state = models.CharField(
        "état",
        max_length=20,
        choices=PublicationState.choices,
        default=PublicationState.DRAFT,
    )
    featured = models.BooleanField("à la une", default=False)
    pinned = models.BooleanField("épinglée", default=False)
    published_at = models.DateTimeField("date de publication")
    created_at = models.DateTimeField("créée le", auto_now_add=True)
    updated_at = models.DateTimeField("modifiée le", auto_now=True)

    class Meta:
        verbose_name = "publication"
        verbose_name_plural = "publications"
        ordering = ["-pinned", "-published_at", "title"]
        indexes = [models.Index(fields=["state", "-published_at"])]

    def __str__(self):
        return self.title

    def clean(self):
        if not str(self.excerpt or "").strip():
            raise ValidationError({"excerpt": "Le résumé est obligatoire."})
        if not str(self.content or "").strip():
            raise ValidationError({"content": "Le contenu est obligatoire."})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(type(self), self.title, max_length=255, instance=self)
        if not self.published_at:
            self.published_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)


def visible_publications(moment=None):
    moment = moment or timezone.now()
    return Publication.objects.filter(
        state=PublicationState.PUBLISHED,
        published_at__lte=moment,
    )
