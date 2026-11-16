"""Importe le répertoire réel. Relançable, sans doublon, dans une transaction."""

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import F

from apps.catalog.models import REGISTER_FIELDS, Author, Book, BookLanguage, BookState, Category, Copy, CopyStatus, Keyword, Publisher, RegisterRow
from apps.catalog.publishers import get_or_create_publisher, sync_publishers
from apps.catalog.repertoire import (
    acquisition_price,
    anomaly_rows,
    call_number,
    group_key,
    plan,
    publication_year,
    read_repertoire,
    repertoire_path,
    secondary_call_number,
    summary_text,
    tidy,
)


class Command(BaseCommand):
    help = "Copie le répertoire puis construit le catalogue. --essai n'écrit rien."

    def add_arguments(self, parser):
        parser.add_argument("--essai", action="store_true", help="N'écrit rien et produit le rapport des anomalies.")
        parser.add_argument("--si-vide", action="store_true", help="Au premier lancement : charge le répertoire si le registre est encore vide.")
        parser.add_argument("--fichier", default="", help="Chemin du CSV. Par défaut, le répertoire monté.")
        parser.add_argument("--rapport", default="", help="Chemin du rapport d'essai.")

    def handle(self, *args, **options):
        path = Path(options["fichier"]) if options["fichier"] else repertoire_path()
        if not path.is_file():
            if options["si_vide"]:
                self.stdout.write("Répertoire absent : import non lancé.")
                return
            raise CommandError(f"Répertoire introuvable : {path}")
        if options["si_vide"]:
            if RegisterRow.objects.exists():
                self.stdout.write("Catalogue déjà initialisé : import non lancé.")
                return
            if Book.objects.exists():
                from django.conf import settings
                from django.core.management import call_command

                if not settings.DEBUG:
                    self.stdout.write("Catalogue déjà rempli : import non lancé.")
                    return
                call_command("reset_demo_catalog")
                Author.objects.update(photo="")
                Author.objects.all().delete()
                Publisher.objects.all().delete()
                Category.objects.filter(parent__isnull=False).delete()
                Category.objects.all().delete()
        rows = read_repertoire(path)
        decisions, totals = plan(rows)
        if options["essai"]:
            report = Path(options["rapport"]) if options["rapport"] else path.with_name("rapport-essai.csv")
            _write_report(report, decisions, totals)
            _print_totals(self.stdout, totals, report)
            return
        with transaction.atomic():
            _store_register(decisions)
            _build_catalog(decisions)
        publishers = sync_publishers(path)
        self.stdout.write(
            f"Registre : {totals['lignes']} lignes. Livres : {totals['livres']}. "
            f"Exemplaires : {totals['exemplaires']}. Éditeurs : {publishers['total']}."
        )


def _print_totals(stdout, totals, report):
    stdout.write(f"Rapport : {report}")
    stdout.write(f"Lignes lues : {totals['lignes']}")
    stdout.write(f"Lignes ignorées : {totals['ignorees']}")
    stdout.write(f"Numéros en double : {totals['doublons']}")
    stdout.write(f"Années invalides : {totals['annees']}")
    stdout.write(f"Livres prévus : {totals['livres']}")
    stdout.write(f"Exemplaires prévus : {totals['exemplaires']}")
    stdout.write(f"Sans classe : {totals['sans_classe']}")


def _write_report(path, decisions, totals):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["type", "ligne", "numero", "detail"])
        writer.writeheader()
        for row in anomaly_rows(decisions):
            writer.writerow(row)
        for key, label in (
            ("lignes", "Lignes lues"),
            ("ignorees", "Lignes ignorées"),
            ("doublons", "Numéros en double"),
            ("annees", "Années invalides"),
            ("livres", "Livres prévus"),
            ("exemplaires", "Exemplaires prévus"),
            ("sans_classe", "Lignes sans classe"),
        ):
            writer.writerow({"type": "total", "ligne": "", "numero": totals[key], "detail": label})


def _store_register(decisions):
    rows = []
    for item in decisions:
        cells = item["cells"]
        values = {field: cells[header] for header, field in REGISTER_FIELDS}
        rows.append(RegisterRow(source_line=item["line"], **values))
    RegisterRow.objects.bulk_create(
        rows,
        batch_size=500,
        update_conflicts=True,
        unique_fields=["source_line"],
        update_fields=[field for _header, field in REGISTER_FIELDS],
    )


def _build_catalog(decisions):
    authors = {}
    categories = {}
    publishers = {}
    books = {}
    for book in Book.objects.filter(imported_at__isnull=False).select_related("publisher").prefetch_related("authors"):
        names = list(book.authors.all())
        author_name = names[0].name if names else ""
        publisher_name = book.publisher.name if book.publisher_id else ""
        books[group_key(book.title, author_name, publisher_name)] = book
    touched_books = set()
    touched_copies = set()
    for item in decisions:
        if not item["imports_copy"]:
            continue
        cells = item["cells"]
        key = group_key(cells["Titre"], cells["Auteur"], cells["Editeur"])
        book = books.get(key)
        if book is None:
            existing = Copy.objects.filter(inventory_number=item["inventory"]).select_related("book", "book__category").first()
            book = existing.book if existing else None
        book_locked = book is not None and _diverged(book)
        if book is None:
            book = _new_book(cells, categories, publishers)
            book.authors.add(_author(cells["Auteur"], authors))
            touched_books.add(book.pk)
        elif not book_locked:
            _fill_book(book, cells, categories, publishers)
            book.authors.add(_author(cells["Auteur"], authors))
            touched_books.add(book.pk)
        if not book_locked:
            _keyword(book, cells["SOUS-DIVISION 1"])
        copy = Copy.objects.filter(inventory_number=item["inventory"]).first()
        if copy is None:
            copy = _new_copy(book, item, cells)
            touched_copies.add(copy.pk)
        elif not _diverged(copy):
            _fill_copy(copy, item, cells)
            touched_copies.add(copy.pk)
        books[key] = book
        item["copy_id"] = copy.pk
    if touched_books:
        Book.objects.filter(pk__in=touched_books).update(imported_at=F("updated_at"))
    if touched_copies:
        Copy.objects.filter(pk__in=touched_copies).update(imported_at=F("updated_at"))
    stored = {row.source_line: row for row in RegisterRow.objects.all()}
    pending = []
    for item in decisions:
        row = stored[item["line"]]
        row.status = item["status"]
        row.copy_id = item.get("copy_id")
        pending.append(row)
    RegisterRow.objects.bulk_update(pending, ["status", "copy"], batch_size=500)


def _diverged(obj):
    return obj.imported_at is not None and obj.updated_at is not None and obj.updated_at > obj.imported_at


def _author(name, cache):
    label = tidy(name)
    key = label.casefold()
    if key in cache:
        return cache[key]
    author = Author.objects.filter(name__iexact=label).first()
    if author is None:
        author = Author.objects.create(name=label[:300])
    cache[key] = author
    return author


def _category(parent, name, cache):
    label = tidy(name)[:120]
    key = (parent.pk if parent else 0, label.casefold())
    if key in cache:
        return cache[key]
    found = Category.objects.filter(parent=parent, name__iexact=label).first()
    if found is None:
        found = Category.objects.create(parent=parent, name=label)
    cache[key] = found
    return found


def _category_of(cells, cache):
    classe = tidy(cells["CLASSE"])
    subclass = tidy(cells["SOUS-CLASSE"])
    parent = _category(None, classe, cache) if classe else None
    if subclass:
        return _category(parent, subclass, cache)
    if parent:
        return parent
    return _category(None, "Sans classe", cache)


def _new_book(cells, categories, publishers):
    year, _invalid = publication_year(cells["Date publ."])
    book = Book(
        title=tidy(cells["Titre"])[:400],
        publisher=get_or_create_publisher(cells["Editeur"], publishers),
        publication_year=year,
        summary=summary_text(cells["Resumé"]),
        language=BookLanguage.FRENCH,
        state=BookState.PUBLISHED,
        category=_category_of(cells, categories),
    )
    book.save()
    return book


def _fill_book(book, cells, categories, publishers):
    proposed = _category_of(cells, categories)
    if proposed.parent_id == book.category_id:
        book.category = proposed
    if not book.summary:
        book.summary = summary_text(cells["Resumé"])
    if book.publication_year is None:
        year, _invalid = publication_year(cells["Date publ."])
        book.publication_year = year
    book.publisher = get_or_create_publisher(cells["Editeur"], publishers)
    book.save()


def _keyword(book, value):
    label = tidy(value)[:200]
    if label and not book.keywords.filter(label__iexact=label).exists():
        Keyword.objects.create(book=book, label=label)


def _new_copy(book, item, cells):
    copy = Copy(
        book=book,
        call_number=call_number(cells["code1"], cells["code2"], cells["Dewey"])[:80],
        inventory_number=item["inventory"] or None,
        fonds=tidy(cells["F.N."])[:32],
        code1=tidy(cells["code1"])[:40],
        code2=tidy(cells["code2"])[:40],
        code3=tidy(cells["code3"])[:40],
        code4=tidy(cells["code4"])[:40],
        dewey=tidy(cells["Dewey"])[:40],
        secondary_call_number=secondary_call_number(cells["code3"], cells["code4"])[:40],
        acquisition_price=acquisition_price(cells["Prix"]),
        section="",
        shelf="",
        status=CopyStatus.AVAILABLE,
    )
    copy.save()
    return copy


def _fill_copy(copy, item, cells):
    copy.call_number = call_number(cells["code1"], cells["code2"], cells["Dewey"])[:80]
    copy.fonds = tidy(cells["F.N."])[:32]
    copy.code1 = tidy(cells["code1"])[:40]
    copy.code2 = tidy(cells["code2"])[:40]
    copy.code3 = tidy(cells["code3"])[:40]
    copy.code4 = tidy(cells["code4"])[:40]
    copy.dewey = tidy(cells["Dewey"])[:40]
    copy.secondary_call_number = secondary_call_number(cells["code3"], cells["code4"])[:40]
    copy.acquisition_price = acquisition_price(cells["Prix"])
    copy.status = CopyStatus.AVAILABLE
    copy.save()
