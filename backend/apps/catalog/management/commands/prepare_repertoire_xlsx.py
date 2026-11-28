"""Prépare repertoire.csv depuis le fichier Excel « REPERTOIRE pour Eraste.xlsx »."""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.catalog.xlsx_repertoire import write_repertoire_csv


def _writable_dir(path: Path) -> bool:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except OSError:
        return False


class Command(BaseCommand):
    help = "Convertit le xlsx (classes/sous-classes Dewey) en repertoire.csv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fichier",
            default="",
            help="Chemin du xlsx. Par défaut : data/import/REPERTOIRE_pour_Eraste.xlsx",
        )
        parser.add_argument(
            "--sortie",
            default="",
            help="CSV de sortie. Par défaut : data/import/repertoire.csv (ou /tmp si lecture seule).",
        )

    def handle(self, *args, **options):
        mounted = Path("/data/import")
        local = Path(__file__).resolve().parents[5] / "data" / "import"
        base = mounted if mounted.is_dir() else local
        source = Path(options["fichier"]) if options["fichier"] else base / "REPERTOIRE_pour_Eraste.xlsx"
        if not source.is_file():
            raise CommandError(f"Fichier Excel introuvable : {source}")

        if options["sortie"]:
            target = Path(options["sortie"])
        elif _writable_dir(base):
            target = base / "repertoire.csv"
        else:
            # Production : /data/import est souvent monté en lecture seule.
            target = Path("/tmp/repertoire.csv")
            self.stdout.write(
                "Dossier d'import en lecture seule : écriture dans /tmp/repertoire.csv"
            )

        try:
            stats = write_repertoire_csv(source, target)
        except OSError as exc:
            raise CommandError(f"Impossible d'écrire {target} : {exc}") from exc

        self.stdout.write(
            f"CSV écrit : {target} — {stats['lignes']} lignes, "
            f"{stats['classes']} classes, {stats['sous_classes']} sous-classes, "
            f"{stats['avec_sous_classe']} avec sous-classe, "
            f"{stats['classe_seule']} classe seule, {stats['sans_classe']} sans classe."
        )
        if target == Path("/tmp/repertoire.csv"):
            self.stdout.write(
                "Ensuite : python manage.py import_repertoire --fichier /tmp/repertoire.csv"
            )
