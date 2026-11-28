"""Prépare repertoire.csv depuis le fichier Excel « REPERTOIRE pour Eraste.xlsx »."""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.catalog.xlsx_repertoire import write_repertoire_csv


class Command(BaseCommand):
    help = "Convertit le xlsx (classes/sous-classes Dewey) en data/import/repertoire.csv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fichier",
            default="",
            help="Chemin du xlsx. Par défaut : data/import/REPERTOIRE_pour_Eraste.xlsx",
        )
        parser.add_argument(
            "--sortie",
            default="",
            help="CSV de sortie. Par défaut : data/import/repertoire.csv",
        )

    def handle(self, *args, **options):
        mounted = Path("/data/import")
        local = Path(__file__).resolve().parents[5] / "data" / "import"
        base = mounted if mounted.is_dir() else local
        source = Path(options["fichier"]) if options["fichier"] else base / "REPERTOIRE_pour_Eraste.xlsx"
        if not source.is_file():
            raise CommandError(f"Fichier Excel introuvable : {source}")
        target = Path(options["sortie"]) if options["sortie"] else base / "repertoire.csv"
        stats = write_repertoire_csv(source, target)
        self.stdout.write(
            f"CSV écrit : {target} — {stats['lignes']} lignes, "
            f"{stats['classes']} classes, {stats['sous_classes']} sous-classes, "
            f"{stats['avec_sous_classe']} avec sous-classe, "
            f"{stats['classe_seule']} classe seule, {stats['sans_classe']} sans classe."
        )
