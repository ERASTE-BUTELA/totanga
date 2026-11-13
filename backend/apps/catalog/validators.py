"""Validation des images du catalogue, redimensionnement et retrait des données de l'appareil."""

from io import BytesIO
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_catalog_image(uploaded):
    extension = Path(uploaded.name).suffix.lower().lstrip(".")
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError("Seuls les fichiers JPG, PNG ou WebP sont acceptés.")

    size = getattr(uploaded, "size", None)
    if size is not None and size > MAX_IMAGE_BYTES:
        raise ValidationError("L'image ne doit pas dépasser 5 Mo.")

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


MAX_IMAGE_EDGE = 1600


def prepare_catalog_image(uploaded):
    """Vérifie l'image, la réduit et l'enregistre sans les données de l'appareil photo."""

    validate_catalog_image(uploaded)
    if hasattr(uploaded, "seek"):
        uploaded.seek(0)
    with Image.open(uploaded) as image:
        image_format = image.format
        if image_format == "PNG" and "A" in image.getbands():
            prepared = image.convert("RGBA")
            target = "PNG"
            extension = "png"
        elif image_format == "WEBP":
            prepared = image.convert("RGBA") if "A" in image.getbands() else image.convert("RGB")
            target = "WEBP"
            extension = "webp"
        else:
            prepared = image.convert("RGB")
            target = "JPEG"
            extension = "jpg"
        prepared.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE))
        buffer = BytesIO()
        save_kwargs = {"format": target}
        if target == "JPEG":
            save_kwargs["quality"] = 85
            save_kwargs["optimize"] = True
        elif target == "WEBP":
            save_kwargs["quality"] = 85
        prepared.save(buffer, **save_kwargs)
    payload = buffer.getvalue()
    if len(payload) > MAX_IMAGE_BYTES:
        raise ValidationError("L'image ne doit pas dépasser 5 Mo.")
    return ContentFile(payload), len(payload), extension
