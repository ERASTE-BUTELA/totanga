"""Éditeurs : création idempotente depuis le répertoire ou un nom libre."""

from apps.catalog.models import Publisher, RegisterRow
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


def sync_publishers(path=None):
    """Crée les éditeurs manquants. Ne touche pas aux fiches déjà présentes."""

    cache = {}
    created = 0
    for name in sorted(collect_publisher_names(path), key=str.casefold):
        before = Publisher.objects.filter(name__iexact=tidy(name)[:200]).exists()
        get_or_create_publisher(name, cache)
        if not before:
            created += 1
    return {"total": Publisher.objects.count(), "created": created}
