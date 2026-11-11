from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

from apps.accounts.guards import LastAdministratorError, ensure_administrator_remains


class StaffUserQuerySet(models.QuerySet):
    def delete(self):
        for user in self.iterator():
            ensure_administrator_remains(user)
        return super().delete()


class StaffUserManager(UserManager):
    def get_queryset(self):
        return StaffUserQuerySet(self.model, using=self._db)


class User(AbstractUser):
    """Compte du personnel.

    Les rôles sont les groupes Django (administrateur, bibliothécaire,
    rédacteur), pas un champ parallèle. Le compte du quotidien n'est pas
    super-utilisateur. Un super-utilisateur n'a pas besoin d'un groupe :
    Django lui accorde tous les droits. Le dernier administrateur actif
    ne peut pas être désactivé ni supprimé.
    """

    objects = StaffUserManager()

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def save(self, *args, **kwargs):
        fields = kwargs.get("update_fields")
        touches_active = fields is None or "is_active" in fields
        if self.pk and touches_active and not self.is_active:
            previous = type(self).objects.filter(pk=self.pk, is_active=True).first()
            if previous is not None and is_last_active_administrator(previous):
                raise LastAdministratorError(
                    "Le dernier administrateur ne peut pas être désactivé, retiré ou supprimé."
                )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        ensure_administrator_remains(self)
        super().delete(*args, **kwargs)


def is_last_active_administrator(user):
    from apps.accounts.guards import is_last_active_administrator as check

    return check(user)


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
