"""Adresses lisibles, uniques, générées à partir d'un texte."""

from django.utils.text import slugify


def unique_slug(model, source, *, max_length, instance=None):
    base = slugify(source)[:max_length].strip("-") or "element"
    slug = base
    counter = 2
    queryset = model._default_manager.all()
    if instance is not None and instance.pk:
        queryset = queryset.exclude(pk=instance.pk)
    while queryset.filter(slug=slug).exists():
        suffix = f"-{counter}"
        slug = f"{base[: max_length - len(suffix)].strip('-')}{suffix}"
        counter += 1
    return slug
