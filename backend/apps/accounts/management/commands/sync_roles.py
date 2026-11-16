"""Synchronise les trois groupes et leurs droits."""

from django.core.management.base import BaseCommand

from apps.accounts.roles import sync_roles


class Command(BaseCommand):
    help = (
        "Crée les groupes administrateur, bibliothécaire et rédacteur. "
        "Les droits par défaut ne sont appliqués qu'à la création, sauf avec --reset."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Réapplique les droits par défaut et écrase les modifications enregistrées.",
        )

    def handle(self, *args, **options):
        sync_roles(reset=bool(options["reset"]))
        if options["reset"]:
            self.stdout.write("Rôles réinitialisés aux droits par défaut.")
        else:
            self.stdout.write("Rôles synchronisés.")
