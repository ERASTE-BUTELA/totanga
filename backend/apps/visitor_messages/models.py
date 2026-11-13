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
