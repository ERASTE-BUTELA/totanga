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
    from django.core.management import call_command

    wait_for_database()
    call_command("migrate", interactive=False)
    call_command("sync_roles")
    call_command("create_admin")

    command = sys.argv[1:] or ["python", "manage.py", "runserver", "0.0.0.0:8000"]
    os.execvp(command[0], command)


if __name__ == "__main__":
    main()
