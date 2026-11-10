"""Synchronise les trois groupes et leurs droits."""

from django.core.management.base import BaseCommand

from apps.accounts.roles import sync_roles


class Command(BaseCommand):
    help = "Crée ou aligne les groupes administrateur, bibliothécaire et rédacteur."

    def handle(self, *args, **options):
        sync_roles()
        self.stdout.write("Rôles synchronisés.")
