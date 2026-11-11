"""Annonces et événements d'exemple. Réservé au développement."""

from datetime import timedelta
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from PIL import Image

from apps.announcements.models import Announcement, AnnouncementState
from apps.catalog.models import StoredImage
from apps.events.models import Event, EventState, Speaker


def _jpeg(color):
    buffer = BytesIO()
    Image.new("RGB", (640, 360), color).save(buffer, format="JPEG", quality=85)
    return ContentFile(buffer.getvalue())


def _image(alt_text, color):
    content = _jpeg(color)
    image = StoredImage(alt_text=alt_text[:200], size=content.size)
    image.file.save("exemple.jpg", content, save=False)
    image.save()
    return image


class Command(BaseCommand):
    help = "Crée des annonces et des événements fictifs. Refusée hors développement."

    def handle(self, *args, **options):
        module = getattr(settings, "SETTINGS_MODULE", "") or ""
        if not settings.DEBUG or "production" in module:
            raise CommandError("Cette commande est réservée au développement.")
        if Announcement.objects.exists() or Event.objects.exists():
            raise CommandError("Des annonces ou des événements existent déjà. Rien n'a été modifié.")

        now = timezone.now().replace(microsecond=0)
        Announcement.objects.create(
            title="Fermeture fictive de la salle de lecture",
            body="Ce texte est un exemple. La salle de lecture serait fermée un mardi imaginaire, puis rouverte le lendemain.",
            category="horaires",
            important=True,
            state=AnnouncementState.PUBLISHED,
            published_at=now - timedelta(days=1),
            display_until=(now + timedelta(days=20)).date(),
            image=_image("Salle de lecture fictive", (92, 45, 128)),
        )
        Announcement.objects.create(
            title="Acquisitions fictives du mois",
            body="Ce texte est un exemple. Quelques ouvrages imaginaires viendraient d'arriver au catalogue de démonstration.",
            category="acquisitions",
            state=AnnouncementState.PUBLISHED,
            published_at=now - timedelta(days=3),
            image=_image("Livres fictifs", (196, 145, 42)),
        )
        Announcement.objects.create(
            title="Travaux fictifs dans le hall",
            body="Ce texte est un exemple. Le hall serait en travaux pendant une semaine imaginaire.",
            category="maintenance",
            state=AnnouncementState.PUBLISHED,
            published_at=now - timedelta(days=5),
        )
        Announcement.objects.create(
            title="Brouillon qui ne doit pas apparaître",
            body="Ce texte est un exemple et reste un brouillon.",
            category="informations",
            state=AnnouncementState.DRAFT,
            published_at=now,
        )
        Announcement.objects.create(
            title="Annonce fictive déjà archivée",
            body="Ce texte est un exemple archivé.",
            category="informations",
            state=AnnouncementState.ARCHIVED,
            published_at=now - timedelta(days=40),
        )

        start = (now + timedelta(days=12)).replace(hour=14, minute=0, second=0, microsecond=0)
        reading = Event.objects.create(
            title="Lecture fictive du mercredi",
            summary="Une rencontre imaginaire autour d'un conte inventé pour la démonstration.",
            event_type="lecture",
            starts_at=start,
            ends_at=start + timedelta(hours=2),
            location="Salle d'exemple",
            audience="Tout public",
            capacity=40,
            registration_url="https://exemple.totanga.test/inscription",
            programme="Accueil\nLecture\nÉchange",
            state=EventState.PUBLISHED,
            image=_image("Lecture fictive", (47, 79, 140)),
        )
        Speaker.objects.create(event=reading, name="Amina Exemple", title="Conteuse", position=1)
        past = now - timedelta(days=6)
        Event.objects.create(
            title="Atelier fictif déjà passé",
            summary="Un atelier imaginaire, conservé au catalogue des événements passés.",
            event_type="atelier",
            starts_at=past,
            ends_at=past + timedelta(hours=2),
            location="Atelier d'exemple",
            programme="Présentation\nPratique",
            state=EventState.PUBLISHED,
        )
        Event.objects.create(
            title="Brouillon d'événement",
            summary="Cet événement fictif n'est pas publié.",
            event_type="conference",
            starts_at=start + timedelta(days=3),
            ends_at=start + timedelta(days=3, hours=1),
            location="Salle d'exemple",
            state=EventState.DRAFT,
        )
        self.stdout.write(self.style.SUCCESS("Annonces et événements d'exemple ajoutés."))
