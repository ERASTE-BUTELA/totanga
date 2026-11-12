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
    )


def filter_books(queryset, text):
    folded = fold_text(text).strip()
    if not folded:
        return queryset
    tokens = [part for part in folded.split() if part]
    if not tokens:
        return queryset

    title_similarity = TrigramSimilarity(Unaccent(Lower("title")), folded)
    author_similarity = TrigramSimilarity(Unaccent(Lower("authors__name")), folded)
    keyword_similarity = TrigramSimilarity(Unaccent(Lower("keywords__label")), folded)
    publisher_similarity = TrigramSimilarity(Unaccent(Lower("publisher__name")), folded)
    ranked = queryset.annotate(
        search_similarity=Greatest(
            Coalesce(title_similarity, Value(0.0)),
            Coalesce(author_similarity, Value(0.0)),
            Coalesce(keyword_similarity, Value(0.0)),
            Coalesce(publisher_similarity, Value(0.0)),
        )
    )

    # Chaque mot doit apparaître quelque part (recherche précise).
    matched = ranked
    for token in tokens:
        matched = matched.filter(_token_clause(token))

    # Requêtes courtes : strictes. Plus longues : ajoute un rappel flou limité.
    if len(folded) < 4:
        return matched.distinct()
    fuzzy = ranked.filter(search_similarity__gt=0.45)
    return (matched | fuzzy).distinct()
