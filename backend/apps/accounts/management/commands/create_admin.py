"""Crée l'administrateur du quotidien décrit dans l'environnement.

Ce compte appartient au groupe administrateur. Il n'est pas
super-utilisateur. Le dépannage passe par la commande Django
``createsuperuser``, qui n'est pas lancée au démarrage.
"""

import os

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand

from apps.accounts.roles import ROLE_ADMIN, sync_roles

USERNAME_VARIABLE = "DJANGO_SUPERUSER_USERNAME"
EMAIL_VARIABLE = "DJANGO_SUPERUSER_EMAIL"
PASSWORD_VARIABLE = "DJANGO_SUPERUSER_PASSWORD"
REQUIRED_VARIABLES = (USERNAME_VARIABLE, EMAIL_VARIABLE, PASSWORD_VARIABLE)


class Command(BaseCommand):
    help = (
        "Crée le compte administrateur du quotidien à partir de "
        "l'environnement, sans privilège de super-utilisateur. "
        "Un compte déjà présent garde son mot de passe et son adresse, "
        "et perd le privilège technique s'il l'avait."
    )

    def handle(self, *args, **options):
        values = {name: os.environ.get(name, "").strip() for name in REQUIRED_VARIABLES}
        missing = [name for name, value in values.items() if not value]
        if missing:
            self.stdout.write(
                self.style.WARNING(
                    "Administrateur non créé. Variables absentes : "
                    + ", ".join(missing)
                    + "."
                )
            )
            return

        sync_roles()
        User = get_user_model()
        login_field = User.USERNAME_FIELD
        identifier = values[USERNAME_VARIABLE]
        group = Group.objects.get(name=ROLE_ADMIN)
        existing = User.objects.filter(**{login_field: identifier}).first()
        if existing is not None:
            existing.is_superuser = False
            existing.is_staff = False
            existing.save(update_fields=["is_superuser", "is_staff"])
            existing.groups.add(group)
            self.stdout.write(
                f"L'administrateur « {identifier} » existe déjà. "
                "Rôle administrateur confirmé, sans privilège technique."
            )
            return

        fields = {login_field: identifier, "password": values[PASSWORD_VARIABLE]}
        if login_field != "email":
            fields["email"] = values[EMAIL_VARIABLE]
        candidate = User(**{key: value for key, value in fields.items() if key != "password"})
        try:
            validate_password(values[PASSWORD_VARIABLE], user=candidate)
        except ValidationError:
            self.stdout.write(
                self.style.ERROR(
                    "Administrateur non créé. Le mot de passe ne respecte pas les règles."
                )
            )
            return

        user = User.objects.create_user(**fields)
        user.groups.add(group)
        self.stdout.write(self.style.SUCCESS(f"Administrateur « {identifier} » créé."))
