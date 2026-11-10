#!/usr/bin/env python
"""Point d'entrée des commandes Django."""

import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django n'est pas installé. Lancez les commandes via Docker "
            "(docker compose exec backend python manage.py ...)."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
