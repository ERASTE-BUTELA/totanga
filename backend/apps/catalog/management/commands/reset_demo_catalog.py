"""Remet le catalogue d'exemple à zéro. Développement seulement.

Les livres ne se suppriment pas en usage normal : un verrou de la base refuse
la suppression, y compris par une requête directe. Cette commande, refusée
dès que DEBUG est faux, désactive ce verrou le temps d'effacer les fiches,
puis le réactive. Les fichiers image déjà enregistrés ne sont pas effacés.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Efface les livres d'exemple pour pouvoir relancer seed_catalog. Développement seulement."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Cette commande est réservée au développement.")
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE catalog_book DISABLE TRIGGER catalog_book_no_delete")
            try:
                with transaction.atomic():
                    cursor.execute("DELETE FROM catalog_book_authors")
                    cursor.execute("DELETE FROM catalog_keyword")
                    cursor.execute("DELETE FROM catalog_copy")
                    cursor.execute("DELETE FROM catalog_book")
            finally:
                cursor.execute("ALTER TABLE catalog_book ENABLE TRIGGER catalog_book_no_delete")
        self.stdout.write(self.style.SUCCESS("Les livres d'exemple ont été retirés. Les fichiers image sont conservés."))
