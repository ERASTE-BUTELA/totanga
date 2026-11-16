"""Catalogue : auteurs, catégories, fiches de livres et exemplaires physiques."""

import re
import uuid
from pathlib import Path

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Value
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
    ITALIAN = "it", "Italien"
    LINGALA = "ln", "Lingala"
    KIKONGO = "kg", "Kikongo"
    TSHILUBA = "lua", "Tshiluba"
    SWAHILI = "sw", "Swahili"
    OTHER = "other", "Autre"


class BookState(models.TextChoices):
    DRAFT = "draft", "Brouillon"
    PUBLISHED = "published", "Publié"
    ARCHIVED = "archived", "Archivé"


def _stored_image_name(folder, filename):
    extension = Path(filename).suffix.lower()
    if extension == ".jpeg":
        extension = ".jpg"
    if extension not in {".jpg", ".png", ".webp"}:
        extension = ""
    return f"{folder}/{uuid.uuid4().hex}{extension}"


def book_cover_path(instance, filename):
    """Conservé pour les migrations déjà appliquées."""

    return _stored_image_name("covers", filename)


def author_photo_path(instance, filename):
    return _stored_image_name("authors", filename)


def shared_image_path(instance, filename):
    return _stored_image_name("images", filename)


def normalize_isbn(value):
    """Garde les chiffres et le X final, retire les tirets. Vide devient rien."""

    cleaned = re.sub(r"[^0-9Xx]", "", str(value or ""))
    return cleaned.upper() or None


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
    name = models.CharField("nom", max_length=300)
    biography = models.TextField("biographie", blank=True)
    photo = models.ImageField(
        "photo",
        upload_to=author_photo_path,
        blank=True,
        validators=[validate_catalog_image],
        help_text="JPG, PNG ou WebP, 5 Mo maximum.",
    )

    class Meta:
        verbose_name = "auteur"
        verbose_name_plural = "auteurs"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Publisher(models.Model):
    """Maison d'édition. Remplie aussi depuis le répertoire Excel/CSV."""

    name = models.CharField("nom", max_length=200)
    notes = models.TextField("notes", blank=True)

    class Meta:
        verbose_name = "éditeur"
        verbose_name_plural = "éditeurs"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Category(AutoSlug):
    name = models.CharField("nom", max_length=120)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
        verbose_name="classe",
    )
    description = models.TextField("description", blank=True)

    class Meta:
        verbose_name = "catégorie"
        verbose_name_plural = "catégories"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["parent", "name"],
                name="catalog_category_parent_name",
                nulls_distinct=False,
            ),
        ]

    def __str__(self):
        return self.name


class StoredImage(models.Model):
    """Fichier d'image réutilisable. On ne l'efface pas tant qu'une fiche le cite."""

    file = models.ImageField(
        "fichier",
        upload_to=shared_image_path,
        validators=[validate_catalog_image],
    )
    alt_text = models.CharField("texte alternatif", max_length=200)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_images",
        verbose_name="envoyé par",
    )
    uploaded_at = models.DateTimeField("envoyé le", auto_now_add=True)
    size = models.PositiveIntegerField("taille en octets")

    class Meta:
        verbose_name = "image"
        verbose_name_plural = "images"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return self.alt_text or self.file.name


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

    def published(self):
        return self.filter(state=BookState.PUBLISHED)

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

    title = models.CharField("titre", max_length=400)
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
        null=True,
        blank=True,
    )
    summary = models.TextField("résumé", blank=True)
    cover_image = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="books",
        verbose_name="couverture",
    )
    language = models.CharField(
        "langue de l'ouvrage",
        max_length=8,
        choices=BookLanguage.choices,
        default=BookLanguage.FRENCH,
    )
    publisher = models.ForeignKey(
        Publisher,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="books",
        verbose_name="éditeur",
    )
    isbn = models.CharField("ISBN", max_length=20, null=True, blank=True)
    page_count = models.PositiveIntegerField(
        "nombre de pages",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(20000)],
    )
    state = models.CharField(
        "état",
        max_length=20,
        choices=BookState.choices,
        default=BookState.DRAFT,
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)
    imported_at = models.DateTimeField("importé le", null=True, blank=True)

    objects = BookQuerySet.as_manager()

    class Meta:
        verbose_name = "livre"
        verbose_name_plural = "livres"
        ordering = ["title"]
        indexes = [
            models.Index(fields=["state"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(publication_year__isnull=True)
                | Q(publication_year__gte=1000, publication_year__lte=2100),
                name="catalog_book_year_range",
            ),
            models.UniqueConstraint(
                fields=["isbn"],
                condition=Q(isbn__isnull=False),
                name="catalog_book_isbn_unique",
            ),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        self.isbn = normalize_isbn(self.isbn)
        super().save(*args, **kwargs)

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


class Keyword(models.Model):
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="keywords",
        verbose_name="livre",
    )
    label = models.CharField("libellé", max_length=200)

    class Meta:
        verbose_name = "mot-clé"
        verbose_name_plural = "mots-clés"
        ordering = ["label"]
        constraints = [
            models.UniqueConstraint(fields=["book", "label"], name="catalog_keyword_unique"),
        ]

    def __str__(self):
        return self.label


class Copy(models.Model):
    book = models.ForeignKey(
        Book,
        on_delete=models.PROTECT,
        related_name="copies",
        verbose_name="livre",
    )
    call_number = models.CharField("cote", max_length=80)
    inventory_number = models.CharField(
        "numéro d'inventaire",
        max_length=32,
        unique=True,
        null=True,
        blank=True,
    )
    fonds = models.CharField("fonds", max_length=32, blank=True)
    code1 = models.CharField("code1", max_length=40, blank=True)
    code2 = models.CharField("code2", max_length=40, blank=True)
    code3 = models.CharField("code3", max_length=40, blank=True)
    code4 = models.CharField("code4", max_length=40, blank=True)
    dewey = models.CharField("Dewey", max_length=40, blank=True)
    secondary_call_number = models.CharField("cote secondaire", max_length=40, blank=True)
    acquisition_price = models.DecimalField(
        "prix d'acquisition",
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    section = models.CharField("rayon", max_length=80, blank=True)
    shelf = models.CharField("étagère", max_length=80, blank=True)
    status = models.CharField(
        "statut",
        max_length=20,
        choices=CopyStatus.choices,
        default=CopyStatus.AVAILABLE,
    )
    acquired_on = models.DateField("date d'acquisition", null=True, blank=True)
    imported_at = models.DateTimeField("importé le", null=True, blank=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        verbose_name = "exemplaire"
        verbose_name_plural = "exemplaires"
        ordering = ["call_number"]
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.inventory_number or self.call_number


class RegisterStatus(models.TextChoices):
    IMPORTED = "importée", "Importée"
    IGNORED = "ignorée", "Ignorée"
    ANOMALY = "anomalie", "Anomalie"


class RegisterRow(models.Model):
    """Miroir exact d'une ligne du répertoire. Rien n'y est nettoyé."""

    source_line = models.PositiveIntegerField("ligne d'origine", unique=True)
    status = models.CharField(
        "statut d'import",
        max_length=20,
        choices=RegisterStatus.choices,
        default=RegisterStatus.IMPORTED,
    )
    copy = models.OneToOneField(
        Copy,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="register_row",
        verbose_name="exemplaire",
    )
    inventory_number = models.TextField("N.  e.", db_column="N.  e.", blank=True)
    fonds = models.TextField("F.N.", db_column="F.N.", blank=True)
    author = models.TextField("Auteur", db_column="Auteur", blank=True)
    title = models.TextField("Titre", db_column="Titre", blank=True)
    publisher = models.TextField("Editeur", db_column="Editeur", blank=True)
    code1 = models.TextField(db_column="code1", blank=True)
    code2 = models.TextField(db_column="code2", blank=True)
    code3 = models.TextField(db_column="code3", blank=True)
    code4 = models.TextField(db_column="code4", blank=True)
    dewey = models.TextField(db_column="Dewey", blank=True)
    published_on = models.TextField("Date publ.", db_column="Date publ.", blank=True)
    price = models.TextField("Prix", db_column="Prix", blank=True)
    classe = models.TextField("CLASSE", db_column="CLASSE", blank=True)
    subclass = models.TextField("SOUS-CLASSE", db_column="SOUS-CLASSE", blank=True)
    division1 = models.TextField("SOUS-DIVISION 1", db_column="SOUS-DIVISION 1", blank=True)
    division2 = models.TextField("SOUS-DIVISION 2", db_column="SOUS-DIVISION 2", blank=True)
    division3 = models.TextField("SOUS-DIVISION 3", db_column="SOUS-DIVISION 3", blank=True)
    summary = models.TextField("Resumé", db_column="Resumé", blank=True)

    class Meta:
        verbose_name = "ligne du registre"
        verbose_name_plural = "registre"
        ordering = ["source_line"]

    def __str__(self):
        return f"Ligne {self.source_line}"

    def cells(self):
        return {header: getattr(self, field) for header, field in REGISTER_FIELDS}


REGISTER_FIELDS = (
    ("N.  e.", "inventory_number"),
    ("F.N.", "fonds"),
    ("Auteur", "author"),
    ("Titre", "title"),
    ("Editeur", "publisher"),
    ("code1", "code1"),
    ("code2", "code2"),
    ("code3", "code3"),
    ("code4", "code4"),
    ("Dewey", "dewey"),
    ("Date publ.", "published_on"),
    ("Prix", "price"),
    ("CLASSE", "classe"),
    ("SOUS-CLASSE", "subclass"),
    ("SOUS-DIVISION 1", "division1"),
    ("SOUS-DIVISION 2", "division2"),
    ("SOUS-DIVISION 3", "division3"),
    ("Resumé", "summary"),
)
