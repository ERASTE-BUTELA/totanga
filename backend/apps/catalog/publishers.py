"""Éditeurs : création depuis le répertoire, puis rattachement aux livres."""

from apps.catalog.models import Book, Publisher, RegisterRow
from apps.catalog.repertoire import read_repertoire, repertoire_path, tidy


def get_or_create_publisher(name, cache=None):
    """Retourne l'éditeur pour ce nom, ou None si le libellé est vide."""

    label = tidy(name)[:200]
    if not label:
        return None
    key = label.casefold()
    if cache is not None and key in cache:
        return cache[key]
    publisher = Publisher.objects.filter(name__iexact=label).first()
    if publisher is None:
        publisher = Publisher.objects.create(name=label)
    if cache is not None:
        cache[key] = publisher
    return publisher


def collect_publisher_names(path=None):
    """Noms uniques issus du CSV (si présent) et du registre déjà importé."""

    names = set()
    if path is None:
        file_path = repertoire_path()
    else:
        file_path = path
    if file_path is not None and file_path.is_file():
        for _line, cells in read_repertoire(file_path):
            label = tidy(cells.get("Editeur", ""))[:200]
            if label:
                names.add(label)
    for raw in RegisterRow.objects.exclude(publisher="").values_list("publisher", flat=True).iterator():
        label = tidy(raw)[:200]
        if label:
            names.add(label)
    return names


def _book_locked(book):
    return book.imported_at is not None and book.updated_at is not None and book.updated_at > book.imported_at


def link_books_from_register():
    """Pose sur chaque livre l'éditeur de sa ligne de registre (colonne Editeur).

    Ne touche pas aux fiches modifiées à la main après l'import.
    """

    cache = {}
    linked = 0
    seen_books = set()
    rows = (
        RegisterRow.objects.exclude(publisher="")
        .exclude(copy_id=None)
        .select_related("copy", "copy__book", "copy__book__publisher")
        .iterator(chunk_size=500)
    )
    for row in rows:
        book = row.copy.book if row.copy_id else None
        if book is None or book.pk in seen_books:
            continue
        seen_books.add(book.pk)
        if _book_locked(book):
            continue
        publisher = get_or_create_publisher(row.publisher, cache)
        if publisher is None:
            continue
        if book.publisher_id == publisher.pk:
            continue
        book.publisher = publisher
        book.save(update_fields=["publisher"])
        linked += 1
    return linked


def sync_publishers(path=None):
    """Crée les éditeurs manquants puis rattache les livres au registre."""

    cache = {}
    created = 0
    for name in sorted(collect_publisher_names(path), key=str.casefold):
        before = Publisher.objects.filter(name__iexact=tidy(name)[:200]).exists()
        get_or_create_publisher(name, cache)
        if not before:
            created += 1
    linked = link_books_from_register()
    return {
        "total": Publisher.objects.count(),
        "created": created,
        "linked": linked,
    }
