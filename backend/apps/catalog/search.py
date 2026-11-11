"""Recherche du catalogue : accents ignorés, fautes de frappe tolérées."""

import unicodedata

from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q, Value
from django.db.models.functions import Coalesce, Greatest, Lower
from django.contrib.postgres.lookups import Unaccent


def fold_text(value):
    decomposed = unicodedata.normalize("NFD", str(value or ""))
    return "".join(character for character in decomposed if unicodedata.category(character) != "Mn").casefold()


def filter_books(queryset, text):
    folded = fold_text(text).strip()
    if not folded:
        return queryset
    title_similarity = TrigramSimilarity(Unaccent(Lower("title")), folded)
    author_similarity = TrigramSimilarity(Unaccent(Lower("authors__name")), folded)
    keyword_similarity = TrigramSimilarity(Unaccent(Lower("keywords__label")), folded)
    return (
        queryset.annotate(
            search_similarity=Greatest(
                Coalesce(title_similarity, Value(0.0)),
                Coalesce(author_similarity, Value(0.0)),
                Coalesce(keyword_similarity, Value(0.0)),
            )
        )
        .filter(
            Q(search_similarity__gt=0.25)
            | Q(title__unaccent__icontains=folded)
            | Q(summary__unaccent__icontains=folded)
            | Q(authors__name__unaccent__icontains=folded)
            | Q(keywords__label__unaccent__icontains=folded)
            | Q(isbn__icontains=folded)
        )
        .distinct()
    )
