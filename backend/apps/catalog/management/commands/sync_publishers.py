"""Aligne la liste des éditeurs sur le répertoire Excel/CSV. Relançable."""

from pathlib import Path

from django.core.management.base import BaseCommand

from apps.catalog.publishers import sync_publishers
from apps.catalog.repertoire import repertoire_path


class Command(BaseCommand):
    help = "Crée les éditeurs du répertoire puis les rattache aux livres."

    def add_arguments(self, parser):
        parser.add_argument("--fichier", default="", help="Chemin du CSV. Par défaut, le répertoire monté.")

    def handle(self, *args, **options):
        path = Path(options["fichier"]) if options["fichier"] else repertoire_path()
        result = sync_publishers(path if path.is_file() else None)
        self.stdout.write(
            f"Éditeurs : {result['total']} au total, {result['created']} créé(s), "
            f"{result['linked']} livre(s) rattaché(s)."
        )
