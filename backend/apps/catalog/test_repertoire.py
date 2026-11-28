import csv
import tempfile
from pathlib import Path

from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase, tag

from apps.accounts.models import User
from apps.accounts.roles import ROLE_LIBRARIAN, sync_roles
from apps.catalog.models import Book, Copy, Publisher, RegisterRow
from apps.catalog.repertoire import HEADERS, call_number, plan, publication_year, read_repertoire, repertoire_path, summary_text


def cells(**values):
    row = {header: "" for header in HEADERS}
    row.update(values)
    return row


def write_csv(path, data_rows):
    with Path(path).open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(data_rows)


class RepertoireRulesTests(TestCase):
    def test_call_number_keeps_text_codes(self):
        self.assertEqual(call_number("302", "1", "DEF"), "302.1 DEF")
        self.assertEqual(call_number("345", "05", "ABC"), "345.05 ABC")

    def test_summary_no_is_empty(self):
        self.assertEqual(summary_text(" NO "), "")
        self.assertEqual(summary_text("Non"), "")
        self.assertEqual(summary_text("notable"), "notable")

    def test_impossible_year_is_empty(self):
        self.assertEqual(publication_year("01/05/2002"), (2002, False))
        self.assertEqual(publication_year("01/05/1799")[0], None)
        self.assertEqual(publication_year("01/01/2209")[0], None)
        self.assertEqual(publication_year("")[0], None)

    def test_plan_groups_ignores_and_flags_duplicates(self):
        decisions, totals = plan(
            [
                (2, cells(**{"N.  e.": "1", "Titre": "Alpha", "Auteur": "Ada", "Editeur": "X", "Date publ.": "2001"})),
                (3, cells(**{"N.  e.": "2", "Titre": " alpha ", "Auteur": "ADA", "Editeur": "x", "Date publ.": "2001"})),
                (4, cells(**{"N.  e.": "1", "Titre": "Autre", "Auteur": "Bea", "Editeur": "Y", "Date publ.": "2001"})),
                (5, cells(**{"N.  e.": "99999", "Titre": "ABC", "Auteur": "Collectif"})),
                (6, cells(**{"N.  e.": "9", "Titre": "Date", "Auteur": "C", "Editeur": "Z", "Date publ.": "2209"})),
            ]
        )
        self.assertEqual(totals["livres"], 2)
        self.assertEqual(totals["exemplaires"], 3)
        self.assertEqual(totals["doublons"], 1)
        self.assertEqual(totals["ignorees"], 1)
        self.assertEqual(totals["annees"], 1)
        self.assertEqual(decisions[3]["status"], "ignorée")
        self.assertFalse(decisions[3]["imports_copy"])
        self.assertEqual(decisions[2]["status"], "anomalie")


class RepertoireImportTests(TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "repertoire.csv"
        write_csv(
            self.path,
            [
                cells(**{
                    "N.  e.": "10",
                    "F.N.": "FN",
                    "Auteur": "Ada",
                    "Titre": "Le meme livre ",
                    "Editeur": "Maison",
                    "code1": "302",
                    "code2": "1",
                    "code3": "12",
                    "code4": "4",
                    "Dewey": "DEFGH",
                    "Date publ.": "01/05/2002",
                    "Prix": "77,77",
                    "CLASSE": "Sciences",
                    "SOUS-CLASSE": "Sociologie",
                    "SOUS-DIVISION 1": "Societe",
                    "Resumé": "no",
                }),
                cells(**{
                    "N.  e.": "11",
                    "Auteur": " ada ",
                    "Titre": "le  meme   livre",
                    "Editeur": "maison",
                    "code1": "345",
                    "code2": "05",
                    "Dewey": "ABC",
                    "Date publ.": "1999",
                    "Prix": "0",
                    "CLASSE": "Sciences",
                    "Resumé": "Un résumé utile",
                }),
                cells(**{
                    "N.  e.": "10",
                    "Auteur": "Bea",
                    "Titre": "Doublon",
                    "Editeur": "Autre",
                    "code1": "100",
                    "Dewey": "ZZZ",
                    "Date publ.": "2000",
                    "CLASSE": "Lettres",
                }),
                cells(**{"N.  e.": "99999", "Auteur": "Collectif", "Titre": "ABC"}),
            ],
        )

    def tearDown(self):
        self.directory.cleanup()

    def test_dry_run_writes_nothing(self):
        report = Path(self.directory.name) / "rapport.csv"
        call_command("import_repertoire", essai=True, fichier=str(self.path), rapport=str(report))
        self.assertEqual(RegisterRow.objects.count(), 0)
        self.assertEqual(Book.objects.count(), 0)
        text = report.read_text(encoding="utf-8-sig")
        self.assertIn("doublon", text)
        self.assertIn("ignoree", text)

    def test_import_rules_and_public_api_hides_price(self):
        call_command("import_repertoire", fichier=str(self.path))
        self.assertEqual(RegisterRow.objects.count(), 4)
        self.assertEqual(Book.objects.count(), 1)
        self.assertEqual(Copy.objects.count(), 2)
        book = Book.objects.get()
        self.assertEqual(book.summary, "Un résumé utile")
        self.assertEqual(book.publication_year, 2002)
        self.assertEqual(book.category.name, "Sociologie")
        self.assertEqual(book.category.parent.name, "Sciences")
        self.assertEqual(book.authors.count(), 1)
        self.assertIsNotNone(book.publisher_id)
        self.assertEqual(book.publisher.name, "Maison")
        self.assertEqual(Publisher.objects.filter(name__iexact="Maison").count(), 1)
        numbers = set(Copy.objects.values_list("call_number", flat=True))
        self.assertIn("302.1 DEF", numbers)
        self.assertIn("345.05 ABC", numbers)
        priced = Copy.objects.get(inventory_number="10")
        self.assertEqual(str(priced.acquisition_price), "77.77")
        self.assertEqual(RegisterRow.objects.get(source_line=2).cells()["Titre"], "Le meme livre ")
        self.assertEqual(RegisterRow.objects.get(source_line=2).cells()["Resumé"], "no")
        self.assertEqual(RegisterRow.objects.get(source_line=5).status, "ignorée")
        self.assertIsNone(RegisterRow.objects.get(source_line=4).copy_id)
        stored = read_repertoire(self.path)
        for line, raw in stored:
            self.assertEqual(RegisterRow.objects.get(source_line=line).cells(), raw)

        books_before = Book.objects.count()
        copies_before = Copy.objects.count()
        call_command("import_repertoire", fichier=str(self.path))
        self.assertEqual(Book.objects.count(), books_before)
        self.assertEqual(Copy.objects.count(), copies_before)
        self.assertEqual(RegisterRow.objects.count(), 4)

        book.title = "Titre revu par le personnel"
        book.save()
        call_command("import_repertoire", fichier=str(self.path))
        book.refresh_from_db()
        self.assertEqual(book.title, "Titre revu par le personnel")

        response = self.client.get(f"/api/catalogue/livres/{book.slug}/")
        body = response.content.decode()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("77.77", body)
        self.assertNotIn("77,77", body)
        self.assertNotIn("acquisition_price", body)
        self.assertNotIn("register", body)

        sync_roles()
        librarian = User.objects.create_user(username="biblio-registre", password="MotDePasse-Test-12")
        librarian.groups.add(Group.objects.get(name=ROLE_LIBRARIAN))
        self.client.force_login(librarian)
        staff = self.client.get(f"/api/gestion/catalogue/livres/{book.pk}/")
        self.assertEqual(staff.status_code, 200)
        self.assertIn("77.77", staff.content.decode())
        self.assertIn("Ligne du registre", staff.content.decode())
        self.assertIn("Le meme livre ", staff.content.decode())

        listing = self.client.get("/api/catalogue/livres/", {"categorie": book.category.parent.slug})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["count"], 1)


@tag("real_repertoire")
class RealRepertoireTests(TestCase):
    """Import complet du CSV réel : trop long pour la CI, lancer à la main."""

    def test_register_matches_every_cell_and_rerun_adds_nothing(self):
        path = repertoire_path()
        self.assertTrue(path.is_file(), "Le fichier data/import/repertoire.csv est introuvable.")
        call_command("import_repertoire", fichier=str(path))
        total = RegisterRow.objects.count()
        self.assertGreaterEqual(total, 9600)
        stored = {row.source_line: row.cells() for row in RegisterRow.objects.all()}
        for line, raw in read_repertoire(path):
            self.assertEqual(stored[line], raw)
        books = Book.objects.count()
        copies = Copy.objects.count()
        call_command("import_repertoire", fichier=str(path))
        self.assertEqual(RegisterRow.objects.count(), total)
        self.assertEqual(Book.objects.count(), books)
        self.assertEqual(Copy.objects.count(), copies)
