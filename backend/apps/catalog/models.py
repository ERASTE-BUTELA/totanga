"""Catalogue : auteurs, catégories, fiches de livres et exemplaires physiques."""

import uuid
from pathlib import Path

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Count, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from apps.catalog.validators import validate_catalog_image
from apps.common.slugs import unique_slug


class BookCannotBeDeleted(Exception):
    """Un livre s'archive. Il ne se supprime pas."""


class CopyStatus(models.TextChoices):
    AVAILABLE = "available", "Disponible"
    BORROWED = "borrowed", "Emprunté"
    RESERVED = "reserved", "Réservé"
    IN_REPAIR = "in_repair", "En réparation"
    LOST = "lost", "Perdu"


class BookLanguage(models.TextChoices):
    FRENCH = "fr", "Français"
    ENGLISH = "en", "Anglais"
    LINGALA = "ln", "Lingala"
    KIKONGO = "kg", "Kikongo"
    TSHILUBA = "lua", "Tshiluba"
    SWAHILI = "sw", "Swahili"


def _stored_image_name(folder, filename):
    extension = Path(filename).suffix.lower()
    if extension == ".jpeg":
        extension = ".jpg"
    if extension not in {".jpg", ".png", ".webp"}:
        extension = ""
    return f"{folder}/{uuid.uuid4().hex}{extension}"


def author_photo_path(instance, filename):
    return _stored_image_name("authors", filename)


def book_cover_path(instance, filename):
    return _stored_image_name("covers", filename)


class AutoSlug(models.Model):
    slug_source = "name"

    slug = models.SlugField(
        "adresse",
        max_length=255,
        unique=True,
        editable=False,
        help_text="Adresse lisible, générée automatiquement.",
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(
                type(self),
                getattr(self, self.slug_source),
                max_length=self._meta.get_field("slug").max_length,
                instance=self,
            )
        super().save(*args, **kwargs)


class Author(models.Model):
    name = models.CharField("nom", max_length=200)
    biography = models.TextField("biographie", blank=True)
    photo = models.ImageField(
        "photo",
        upload_to=author_photo_path,
        blank=True,
        validators=[validate_catalog_image],
        help_text="JPG, PNG ou WebP, 2 Mo maximum.",
    )

    class Meta:
        verbose_name = "auteur"
        verbose_name_plural = "auteurs"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Category(AutoSlug):
    name = models.CharField("nom", max_length=120, unique=True)
    description = models.TextField("description", blank=True)

    class Meta:
        verbose_name = "catégorie"
        verbose_name_plural = "catégories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class BookQuerySet(models.QuerySet):
    def with_copy_counts(self):
        """Ajoute le nombre d'exemplaires et le nombre d'exemplaires disponibles."""
        copies = Copy.objects.filter(book_id=OuterRef("pk"))
        return self.annotate(
            annotated_copy_count=_count_subquery(copies),
            annotated_available_copy_count=_count_subquery(
                copies.filter(status=CopyStatus.AVAILABLE)
            ),
        )

    def available(self):
        return self.filter(copies__status=CopyStatus.AVAILABLE).distinct()

    def delete(self):
        raise BookCannotBeDeleted("Un livre ne se supprime pas. Archivez-le.")


def _count_subquery(queryset):
    counted = queryset.order_by().values("book_id").annotate(total=Count("pk")).values("total")
    return Coalesce(
        Subquery(counted[:1], output_field=IntegerField()),
        Value(0),
        output_field=IntegerField(),
    )


class Book(AutoSlug):
    slug_source = "title"

    title = models.CharField("titre", max_length=255)
    authors = models.ManyToManyField(
        Author,
        related_name="books",
        verbose_name="auteurs",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="books",
        verbose_name="catégorie",
    )
    publication_year = models.PositiveIntegerField(
        "année de publication",
        validators=[MinValueValidator(1000), MaxValueValidator(2100)],
    )
    summary = models.TextField("résumé")
    cover = models.ImageField(
        "couverture",
        upload_to=book_cover_path,
        validators=[validate_catalog_image],
        help_text="JPG, PNG ou WebP, 2 Mo maximum.",
    )
    language = models.CharField(
        "langue",
        max_length=8,
        choices=BookLanguage.choices,
        default=BookLanguage.FRENCH,
    )
    publisher = models.CharField("éditeur", max_length=200, blank=True)
    isbn = models.CharField("ISBN", max_length=20, blank=True)
    page_count = models.PositiveIntegerField(
        "nombre de pages",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(20000)],
    )
    keywords = models.JSONField("mots-clés", default=list, blank=True)
    published = models.BooleanField(
        "publié",
        default=True,
        help_text="Un brouillon reste enregistré, sans être proposé au public.",
    )
    archived = models.BooleanField(
        "archivé",
        default=False,
        help_text="Un livre archivé reste enregistré. Il n'est pas effacé.",
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    objects = BookQuerySet.as_manager()

    class Meta:
        verbose_name = "livre"
        verbose_name_plural = "livres"
        ordering = ["title"]
        indexes = [
            models.Index(fields=["archived"]),
        ]

    def __str__(self):
        return self.title

    @property
    def copy_count(self):
        if "annotated_copy_count" in self.__dict__:
            return self.annotated_copy_count
        return self.copies.count()

    @property
    def available_copy_count(self):
        if "annotated_available_copy_count" in self.__dict__:
            return self.annotated_available_copy_count
        return self.copies.filter(status=CopyStatus.AVAILABLE).count()

    @property
    def is_available(self):
        return self.available_copy_count > 0

    def delete(self, *args, **kwargs):
        raise BookCannotBeDeleted("Un livre ne se supprime pas. Archivez-le.")


class Copy(models.Model):
    book = models.ForeignKey(
        Book,
        on_delete=models.PROTECT,
        related_name="copies",
        verbose_name="livre",
    )
    call_number = models.CharField(
        "cote",
        max_length=50,
        unique=True,
        help_text="Référence unique pour retrouver l'exemplaire dans la bibliothèque.",
        error_messages={"unique": "Cette cote est déjà utilisée."},
    )
    section = models.CharField("rayon", max_length=80)
    shelf = models.CharField("étagère", max_length=80)
    status = models.CharField(
        "statut",
        max_length=20,
        choices=CopyStatus.choices,
        default=CopyStatus.AVAILABLE,
    )
    acquired_on = models.DateField("date d'acquisition", null=True, blank=True)

    class Meta:
        verbose_name = "exemplaire"
        verbose_name_plural = "exemplaires"
        ordering = ["call_number"]
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.call_number
