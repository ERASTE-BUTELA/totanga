from django.conf import settings
from django.db import models


class VisitorMessage(models.Model):
    KIND_CONTACT = "contact"
    KIND_AVIS = "avis"
    KINDS = (
        (KIND_CONTACT, "Message de contact"),
        (KIND_AVIS, "Avis sur la bibliothèque"),
    )
    SUBJECTS = (
        ("generale", "Question générale"),
        ("horaires", "Horaires et services"),
        ("catalogue", "Catalogue"),
        ("evenement", "Événement"),
        ("autre", "Autre"),
        ("avis", "Avis sur la bibliothèque"),
    )

    kind = models.CharField(
        "type",
        max_length=20,
        choices=KINDS,
        default=KIND_CONTACT,
        db_index=True,
    )
    name = models.CharField("nom", max_length=80)
    email = models.EmailField("adresse électronique", max_length=254, blank=True)
    whatsapp = models.CharField("WhatsApp", max_length=40, blank=True)
    subject = models.CharField("sujet", max_length=20, choices=SUBJECTS)
    body = models.TextField("message", max_length=1000)
    is_read = models.BooleanField("lu", default=False)
    created_at = models.DateTimeField("envoyé le", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "message d'un visiteur"
        verbose_name_plural = "messages des visiteurs"

    def __str__(self):
        return f"{self.name} — {self.get_subject_display()}"

    def contact_key(self):
        """Clé stable pour regrouper la discussion (e-mail ou WhatsApp)."""
        email = (self.email or "").strip().lower()
        if email:
            return f"email:{email}"
        whatsapp = "".join(character for character in (self.whatsapp or "") if character.isdigit())
        if whatsapp:
            return f"whatsapp:{whatsapp}"
        return f"id:{self.pk}"


class VisitorMessageReply(models.Model):
    """Réponse du personnel conservée dans l'historique de discussion."""

    CHANNEL_EMAIL = "email"
    CHANNEL_WHATSAPP = "whatsapp"
    CHANNELS = (
        (CHANNEL_EMAIL, "Courriel"),
        (CHANNEL_WHATSAPP, "WhatsApp"),
    )

    message = models.ForeignKey(
        VisitorMessage,
        on_delete=models.CASCADE,
        related_name="replies",
        verbose_name="message",
    )
    body = models.TextField("réponse", max_length=2000)
    channel = models.CharField("canal", max_length=20, choices=CHANNELS, default=CHANNEL_EMAIL)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="visitor_message_replies",
        verbose_name="auteur",
    )
    actor_name = models.CharField("nom affiché", max_length=120, blank=True)
    created_at = models.DateTimeField("envoyé le", auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "réponse à un message visiteur"
        verbose_name_plural = "réponses aux messages visiteurs"

    def __str__(self):
        return f"Réponse #{self.pk} — message {self.message_id}"
