"""Recherche du catalogue : accents ignorés, fautes de frappe tolérées."""

import unicodedata

from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q, Value
from django.db.models.functions import Coalesce, Greatest, Lower
from django.contrib.postgres.lookups import Unaccent


def fold_text(value):
    decomposed = unicodedata.normalize("NFD", str(value or ""))
    return "".join(character for character in decomposed if unicodedata.category(character) != "Mn").casefold()


def _token_clause(token):
    return (
        Q(title__unaccent__icontains=token)
        | Q(summary__unaccent__icontains=token)
        | Q(authors__name__unaccent__icontains=token)
        | Q(publisher__name__unaccent__icontains=token)
        | Q(keywords__label__unaccent__icontains=token)
        | Q(isbn__icontains=token)
        | Q(copies__inventory_number__icontains=token)
        | Q(copies__call_number__icontains=token)
        | Q(copies__code1__icontains=token)
        | Q(copies__code2__icontains=token)
        | Q(copies__code3__icontains=token)
        | Q(copies__code4__icontains=token)
        | Q(copies__dewey__icontains=token)
        | Q(copies__register_row__classe__unaccent__icontains=token)
        | Q(copies__register_row__subclass__unaccent__icontains=token)
        | Q(copies__register_row__division1__unaccent__icontains=token)
    )


def filter_books(queryset, text):
    """Filtre d'abord (index), puis calcule la similarité seulement sur les résultats."""

    folded = fold_text(text).strip()
    if not folded:
        return queryset
    tokens = [part for part in folded.split() if part]
    if not tokens:
        return queryset

    matched = queryset
    for token in tokens:
        matched = matched.filter(_token_clause(token))
    matched = matched.distinct()

    # Similarité uniquement sur le sous-ensemble déjà filtré (évite un scan du catalogue).
    title_similarity = TrigramSimilarity(Unaccent(Lower("title")), folded)
    author_similarity = TrigramSimilarity(Unaccent(Lower("authors__name")), folded)
    keyword_similarity = TrigramSimilarity(Unaccent(Lower("keywords__label")), folded)
    publisher_similarity = TrigramSimilarity(Unaccent(Lower("publisher__name")), folded)
    return matched.annotate(
        search_similarity=Greatest(
            Coalesce(title_similarity, Value(0.0)),
            Coalesce(author_similarity, Value(0.0)),
            Coalesce(keyword_similarity, Value(0.0)),
            Coalesce(publisher_similarity, Value(0.0)),
        )
    )
