"""Validation des images du catalogue. Pas de redimensionnement."""

from pathlib import Path

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 2 * 1024 * 1024


def validate_catalog_image(uploaded):
    extension = Path(uploaded.name).suffix.lower().lstrip(".")
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")

    size = getattr(uploaded, "size", None)
    if size is not None and size > MAX_IMAGE_BYTES:
        raise ValidationError("L'image ne doit pas dépasser 2 Mo.")

    if hasattr(uploaded, "seek"):
        uploaded.seek(0)
    try:
        with Image.open(uploaded) as image:
            image_format = image.format
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError("Le fichier n'est pas une image valide.") from exc
    finally:
        if hasattr(uploaded, "seek"):
            uploaded.seek(0)

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")
