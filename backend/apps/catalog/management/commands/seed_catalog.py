"""Catalogue d'exemple, réservé au développement."""

from datetime import date
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from PIL import Image

from apps.catalog.models import Author, Book, BookLanguage, Category, Copy, CopyStatus


CATEGORIES = (
    ("Roman africain", "Romans d'écrivains d'Afrique et de la diaspora."),
    ("Jeunesse", "Récits accessibles aux plus jeunes lecteurs."),
    ("Poésie", ""),
    ("Histoire", "Ouvrages sur l'histoire du Congo et de l'Afrique."),
)

AUTHORS = (
    ("Sony Labou Tansi", "Écrivain et metteur en scène congolais."),
    ("Alain Mabanckou", "Romancier congolais, né à Pointe-Noire."),
    ("Henri Lopes", "Écrivain et homme politique congolais."),
    ("In Koli Jean Bofane", ""),
    ("Léonora Miano", ""),
    ("Scholastique Mukasonga", ""),
    ("Chimamanda Ngozi Adichie", ""),
    ("Camara Laye", ""),
    ("Amadou Hampâté Bâ", "Écrivain et conteur peul."),
    ("Tchicaya U Tam'si", "Poète congolais."),
    ("Isidore Ndaywel è Nziem", "Historien congolais."),
    ("Mariama Bâ", ""),
    ("Emmanuel Dongala", "Écrivain congolais."),
)

# titre, auteur, catégorie, année, langue, éditeur, archivé, résumé, exemplaires
# exemplaire : cote, rayon, étagère, statut, date d'acquisition ou None
BOOKS = (
    (
        "La Vie et demie",
        "Sony Labou Tansi",
        "Roman africain",
        1979,
        BookLanguage.FRENCH,
        "Seuil",
        False,
        "Un récit où les morts refusent de quitter les vivants.",
        (
            ("RA-001", "Romans", "A1", CopyStatus.AVAILABLE, date(2019, 3, 12)),
            ("RA-002", "Romans", "A1", CopyStatus.BORROWED, date(2021, 6, 4)),
        ),
    ),
    (
        "L'Anté-peuple",
        "Sony Labou Tansi",
        "Roman africain",
        1983,
        BookLanguage.FRENCH,
        "Seuil",
        False,
        "Un homme ordinaire est pris dans une machination politique.",
        (("RA-003", "Romans", "A1", CopyStatus.AVAILABLE, date(2020, 1, 20)),),
    ),
    (
        "Verre cassé",
        "Alain Mabanckou",
        "Roman africain",
        2005,
        BookLanguage.FRENCH,
        "Seuil",
        False,
        "Le cahier d'un habitué de bar, qui raconte les vies autour de lui.",
        (
            ("RA-004", "Romans", "A2", CopyStatus.BORROWED, date(2018, 11, 2)),
            ("RA-005", "Romans", "A2", CopyStatus.RESERVED, None),
        ),
    ),
    (
        "Mémoires de porc-épic",
        "Alain Mabanckou",
        "Roman africain",
        2006,
        BookLanguage.FRENCH,
        "Seuil",
        False,
        "Un porc-épic raconte sa vie de double.",
        (("RA-006", "Romans", "A2", CopyStatus.AVAILABLE, date(2022, 5, 9)),),
    ),
    (
        "Le Pleurer-rire",
        "Henri Lopes",
        "Roman africain",
        1982,
        BookLanguage.FRENCH,
        "Présence Africaine",
        False,
        "La satire d'un dictateur et de sa cour.",
        (("RA-007", "Romans", "A3", CopyStatus.IN_REPAIR, date(2016, 8, 30)),),
    ),
    (
        "Congo Inc.",
        "In Koli Jean Bofane",
        "Roman africain",
        2014,
        BookLanguage.FRENCH,
        "Actes Sud",
        False,
        "Un jeune homme traverse Kinshasa et ses trafics.",
        (
            ("RA-008", "Romans", "A3", CopyStatus.AVAILABLE, date(2023, 2, 14)),
            ("RA-009", "Romans", "A3", CopyStatus.LOST, date(2015, 4, 1)),
        ),
    ),
    (
        "La Saison de l'ombre",
        "Léonora Miano",
        "Roman africain",
        2013,
        BookLanguage.FRENCH,
        "Grasset",
        False,
        "Le destin d'un village après une rafle.",
        (("RA-010", "Romans", "A4", CopyStatus.RESERVED, None),),
    ),
    (
        "Notre-Dame du Nil",
        "Scholastique Mukasonga",
        "Roman africain",
        2012,
        BookLanguage.FRENCH,
        "Gallimard",
        False,
        "Un lycée de jeunes filles au Rwanda, à la veille des massacres.",
        (("RA-011", "Romans", "A4", CopyStatus.AVAILABLE, date(2024, 9, 18)),),
    ),
    (
        "Purple Hibiscus",
        "Chimamanda Ngozi Adichie",
        "Roman africain",
        2003,
        BookLanguage.ENGLISH,
        "Algonquin Books",
        False,
        "Une adolescente grandit sous l'autorité d'un père violent.",
        (
            ("RA-012", "Romans", "B1", CopyStatus.AVAILABLE, date(2021, 10, 7)),
            ("RA-013", "Romans", "B1", CopyStatus.BORROWED, date(2017, 12, 11)),
        ),
    ),
    (
        "L'Enfant noir",
        "Camara Laye",
        "Jeunesse",
        1953,
        BookLanguage.FRENCH,
        "Plon",
        False,
        "L'enfance d'un garçon en Haute-Guinée, jusqu'au départ pour l'école.",
        (("JEU-001", "Jeunesse", "B1", CopyStatus.AVAILABLE, date(2014, 3, 3)),),
    ),
    (
        "Amkoullel, l'enfant peul",
        "Amadou Hampâté Bâ",
        "Jeunesse",
        1991,
        BookLanguage.FRENCH,
        "Actes Sud",
        False,
        "Les souvenirs d'enfance d'un conteur peul.",
        (("JEU-002", "Jeunesse", "B2", CopyStatus.BORROWED, date(2019, 7, 22)),),
    ),
    (
        "Le Mauvais Sang",
        "Tchicaya U Tam'si",
        "Poésie",
        1955,
        BookLanguage.FRENCH,
        "",
        False,
        "Premier recueil de poèmes de Tchicaya U Tam'si.",
        (("POE-001", "Poésie", "C1", CopyStatus.AVAILABLE, None),),
    ),
    (
        "Histoire générale du Congo",
        "Isidore Ndaywel è Nziem",
        "Histoire",
        1998,
        BookLanguage.FRENCH,
        "De Boeck",
        False,
        "Une synthèse de l'histoire du Congo, des origines au XXe siècle.",
        (
            ("HIS-001", "Histoire", "D2", CopyStatus.AVAILABLE, date(2018, 1, 15)),
            ("HIS-002", "Histoire", "D2", CopyStatus.IN_REPAIR, date(2013, 5, 27)),
        ),
    ),
    (
        "Une si longue lettre",
        "Mariama Bâ",
        "Roman africain",
        1979,
        BookLanguage.FRENCH,
        "Nouvelles Éditions Africaines",
        True,
        "Une lettre entre deux amies, au lendemain d'un deuil.",
        (("RA-014", "Romans", "A2", CopyStatus.AVAILABLE, date(2010, 9, 9)),),
    ),
    (
        "Le Feu des origines",
        "Emmanuel Dongala",
        "Roman africain",
        1987,
        BookLanguage.FRENCH,
        "Albin Michel",
        False,
        "L'histoire d'une famille à travers les ruptures du Congo.",
        (("RA-015", "Romans", "A4", CopyStatus.LOST, date(2011, 2, 2)),),
    ),
)

COVER_COLORS = (
    (92, 46, 36),
    (36, 74, 92),
    (120, 72, 28),
    (48, 86, 62),
    (92, 40, 58),
    (40, 62, 110),
    (110, 86, 36),
    (62, 48, 92),
    (28, 92, 86),
    (130, 60, 40),
    (50, 90, 40),
    (80, 50, 70),
    (40, 70, 90),
    (100, 50, 50),
    (60, 60, 60),
)


def _jpeg(color, size):
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="JPEG", quality=85)
    return ContentFile(buffer.getvalue())


class Command(BaseCommand):
    help = "Crée un catalogue d'exemple : catégories, auteurs, livres et exemplaires."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Cette commande est réservée au développement.")
        if Book.objects.exists():
            raise CommandError(
                "Des livres existent déjà. Le catalogue d'exemple n'a pas été modifié."
            )

        with transaction.atomic():
            categories = {}
            for name, description in CATEGORIES:
                category, _created = Category.objects.get_or_create(
                    name=name,
                    defaults={"description": description},
                )
                categories[name] = category

            authors = {}
            for name, biography in AUTHORS:
                author, _created = Author.objects.get_or_create(
                    name=name,
                    defaults={"biography": biography},
                )
                authors[name] = author

            for index, book_data in enumerate(BOOKS):
                (
                    title,
                    author_name,
                    category_name,
                    year,
                    language,
                    publisher,
                    archived,
                    summary,
                    copies,
                ) = book_data
                book = Book(
                    title=title,
                    category=categories[category_name],
                    publication_year=year,
                    language=language,
                    publisher=publisher,
                    summary=summary,
                    archived=archived,
                )
                book.cover.save(
                    "couverture.jpg",
                    _jpeg(COVER_COLORS[index], (80, 120)),
                    save=False,
                )
                book.save()
                book.authors.add(authors[author_name])
                for call_number, section, shelf, status, acquired_on in copies:
                    Copy.objects.create(
                        book=book,
                        call_number=call_number,
                        section=section,
                        shelf=shelf,
                        status=status,
                        acquired_on=acquired_on,
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(BOOKS)} livres d'exemple ont été ajoutés au catalogue."
            )
        )
