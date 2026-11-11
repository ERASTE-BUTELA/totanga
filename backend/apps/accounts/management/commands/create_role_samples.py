"""Crée un compte d'essai par rôle. Réservé au développement."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.roles import (
    ROLE_ADMIN,
    ROLE_EDITOR,
    ROLE_LABELS,
    ROLE_LIBRARIAN,
    sync_roles,
)

SAMPLES = (
    ("essai-administrateur", "Totanga-Essai-Admin-2026", ROLE_ADMIN),
    ("essai-bibliothecaire", "Totanga-Essai-Biblio-2026", ROLE_LIBRARIAN),
    ("essai-redacteur", "Totanga-Essai-Redac-2026", ROLE_EDITOR),
)

SUPER_SAMPLE = ("essai-superadmin", "Totanga-Essai-Super-2026")


class Command(BaseCommand):
    help = (
        "Crée un compte d'essai pour chaque rôle. "
        "Refusée lorsque DEBUG est faux."
    )

    def handle(self, *args, **options):
        module = getattr(settings, "SETTINGS_MODULE", "") or ""
        if not settings.DEBUG or "production" in module:
            raise CommandError("Cette commande est réservée au développement.")

        sync_roles()
        User = get_user_model()
        for username, password, role in SAMPLES:
            group = Group.objects.get(name=role)
            user = User.objects.filter(username=username).first()
            if user is None:
                validate_password(password, user=User(username=username))
                user = User.objects.create_user(username=username, password=password)
            else:
                user.set_password(password)
            user.first_name = "Essai"
            user.last_name = ROLE_LABELS[role]
            user.email = ""
            user.is_staff = False
            user.is_superuser = False
            user.is_active = True
            user.save()
            user.groups.set([group])
            self.stdout.write(f"Compte d'essai « {username} » prêt, rôle {role}.")

        username, password = SUPER_SAMPLE
        user = User.objects.filter(username=username).first()
        if user is None:
            validate_password(password, user=User(username=username))
            user = User.objects.create_user(username=username, password=password)
        else:
            user.set_password(password)
        user.first_name = "Essai"
        user.last_name = "Super-administrateur"
        user.email = ""
        user.is_staff = False
        user.is_superuser = True
        user.is_active = True
        user.save()
        user.groups.clear()
        self.stdout.write(f"Compte d'essai « {username} » prêt, super-utilisateur sans groupe.")
