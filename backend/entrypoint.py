"""Démarre le backend : base prête, migrations, administrateur, puis la commande."""

import os
import sys
import time


def wait_for_database():
    from django.db import connection
    from django.db.utils import OperationalError

    for attempt in range(1, 31):
        try:
            connection.ensure_connection()
            return
        except OperationalError:
            connection.close()
            print(
                f"Base de données indisponible (essai {attempt}/30).",
                flush=True,
            )
            time.sleep(1)
    print("La base de données n'est pas prête. Démarrage interrompu.", flush=True)
    sys.exit(1)


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    import django

    django.setup()
    from django.conf import settings
    from django.core.management import call_command

    wait_for_database()
    call_command("migrate", interactive=False)
    call_command("sync_roles")
    call_command("create_admin")
    # 1) Remplir la table Éditeur depuis le répertoire (colonne Editeur).
    # 2) Importer les livres / exemplaires en les rattachant.
    # 3) Rattacher à nouveau les livres encore sans éditeur (bases déjà peuplées).
    call_command("sync_publishers")
    call_command("import_repertoire", si_vide=True)
    call_command("sync_publishers")
    if not settings.DEBUG:
        call_command("collectstatic", interactive=False, verbosity=0)

    command = sys.argv[1:] or [
        "gunicorn",
        "config.wsgi:application",
        "--bind",
        "0.0.0.0:8000",
    ]
    os.execvp(command[0], command)


if __name__ == "__main__":
    main()
