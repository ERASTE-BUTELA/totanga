from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Compte du personnel.

    Les rôles sont les groupes Django (administrateur, bibliothécaire,
    rédacteur), pas un champ parallèle. Le compte du quotidien n'est pas
    super-utilisateur.
    """

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"


class StaffAction(models.Model):
    """Journal : qui, quelle action, quel objet, quand.

    Pas de mot de passe, de clé, d'adresse électronique, d'adresse IP
    ni de corps de message.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_actions",
        verbose_name="personne",
    )
    action = models.CharField("action", max_length=40)
    target_type = models.CharField("type d'objet", max_length=80, blank=True)
    target_id = models.CharField("identifiant d'objet", max_length=64, blank=True)
    created_at = models.DateTimeField("date", auto_now_add=True)

    class Meta:
        verbose_name = "action du personnel"
        verbose_name_plural = "actions du personnel"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["-created_at"])]
