"""Fiche unique de la bibliothèque et réglages généraux de la plateforme."""

from django.core.exceptions import ValidationError
from django.db import models

from apps.catalog.models import StoredImage


class Library(models.Model):
    """Une seule ligne (identifiant fixé à 1)."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    name = models.CharField("nom", max_length=200)
    slogan = models.CharField("slogan", max_length=255, blank=True)
    address = models.CharField("adresse", max_length=300)
    city = models.CharField("ville", max_length=120, default="Kinshasa")
    phone = models.CharField("téléphone", max_length=40)
    email = models.EmailField("adresse électronique de contact")
    website = models.URLField("site web", blank=True)
    facebook_url = models.URLField("Facebook", blank=True)
    whatsapp_url = models.URLField("WhatsApp", blank=True)
    youtube_url = models.URLField("YouTube", blank=True)
    instagram_url = models.URLField("Instagram", blank=True)
    tiktok_url = models.URLField("TikTok", blank=True)
    hours_text = models.CharField(
        "horaires d'ouverture",
        max_length=300,
        blank=True,
        help_text="Texte libre, ex. Lundi à vendredi 8 h – 17 h",
    )
    maps_url = models.CharField("localisation Google Maps", max_length=500, blank=True)
    latitude = models.DecimalField(
        "latitude",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        "longitude",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    about = models.TextField("histoire de la bibliothèque", blank=True)
    functioning = models.TextField("structure et fonctionnement", blank=True)
    logo = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="library_logos",
        verbose_name="logo",
    )
    favicon = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="library_favicons",
        verbose_name="favicon",
    )
    hero_image = models.ForeignKey(
        StoredImage,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="library_heroes",
        verbose_name="image du bandeau d'accueil",
    )
    language = models.CharField("langue par défaut", max_length=40, default="Français")
    theme = models.CharField("thème", max_length=40, default="Violet (Totanga)")
    dark_mode = models.BooleanField("mode sombre", default=False)
    timezone = models.CharField(
        "fuseau horaire",
        max_length=80,
        default="(UTC+01:00) Kinshasa",
    )
    date_format = models.CharField("format de date", max_length=40, default="31 déc. 2026")
    time_format = models.CharField(
        "format d'heure",
        max_length=40,
        default="24 heures (14:30)",
    )
    page_size = models.PositiveSmallIntegerField("éléments par page", default=10)
    maintenance = models.BooleanField("mode maintenance", default=False)
    updated_at = models.DateTimeField("modifiée le", auto_now=True)

    class Meta:
        verbose_name = "bibliothèque"
        verbose_name_plural = "bibliothèque"

    def __str__(self):
        return self.name

    def clean(self):
        if self.pk not in (None, 1):
            raise ValidationError({"id": "La fiche bibliothèque est unique (identifiant 1)."})
        if self.page_size not in (10, 25, 50):
            raise ValidationError({"page_size": "Choisissez 10, 25 ou 50."})
        if (self.latitude is None) ^ (self.longitude is None):
            raise ValidationError(
                {"latitude": "Indiquez la latitude et la longitude ensemble, ou aucun des deux."}
            )

    def save(self, *args, **kwargs):
        self.pk = 1
        self.full_clean()
        return super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        library, _created = cls.objects.get_or_create(
            pk=1,
            defaults={
                "name": "Bibliothèque Totanga",
                "slogan": "Un espace de savoir, de culture et de découverte à Kinshasa.",
                "address": "12, avenue des Exemples, Kinshasa",
                "city": "Kinshasa",
                "phone": "+243 800 000 000",
                "email": "contact@exemple.totanga.test",
                "about": (
                    "<p>La Bibliothèque Totanga informe le public : catalogue, "
                    "annonces, publications et événements. Les ouvrages se "
                    "consultent sur place.</p>"
                ),
            },
        )
        return library


class LibraryCarouselImage(models.Model):
    """Photo du carrousel de la page À propos (ordre = position)."""

    library = models.ForeignKey(
        Library,
        on_delete=models.CASCADE,
        related_name="carousel_images",
        verbose_name="bibliothèque",
    )
    image = models.ForeignKey(
        StoredImage,
        on_delete=models.PROTECT,
        related_name="library_carousel",
        verbose_name="image",
    )
    position = models.PositiveSmallIntegerField("ordre", default=0)

    class Meta:
        ordering = ("position", "id")
        verbose_name = "photo du carrousel"
        verbose_name_plural = "photos du carrousel"

    def __str__(self):
        return f"Carrousel #{self.position}"
