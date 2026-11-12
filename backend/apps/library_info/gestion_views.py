"""API du personnel pour la fiche bibliothèque et les réglages généraux."""

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.accounts.audit import record_staff_action
from apps.catalog.models import StoredImage
from apps.catalog.validators import prepare_catalog_image

from .html import sanitize_rich_text
from .models import Library
from .serializers import library_payload

ACTION_LIBRARY_UPDATED = "mise_a_jour_bibliotheque"

PAGE_SIZES = {10, 25, 50}
LANGUAGES = {"Français"}
THEMES = {"Violet (Totanga)"}
TIMEZONES = {"(UTC+01:00) Kinshasa"}
DATE_FORMATS = {"31 déc. 2026", "31/12/2026"}
TIME_FORMATS = {"24 heures (14:30)", "12 heures (02:30 PM)"}


def _fail(message, status=400):
    return Response({"detail": message}, status=status)


def _truthy(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _optional_http_url(value, *, label):
    url = str(value or "").strip()
    if not url:
        return "", ""
    if not url.lower().startswith(("http://", "https://")):
        return "", f"{label} doit commencer par http:// ou https://."
    try:
        URLValidator()(url)
    except ValidationError:
        return "", f"{label} n'est pas une adresse valide."
    return url, ""


def _optional_whatsapp(value):
    raw = str(value or "").strip()
    if not raw:
        return "", ""
    if raw.lower().startswith(("http://", "https://")):
        return _optional_http_url(raw, label="Le lien WhatsApp")
    digits = "".join(character for character in raw if character.isdigit())
    if not (8 <= len(digits) <= 15):
        return "", "Indiquez un numéro WhatsApp (ex. +243800000000) ou un lien https://wa.me/…"
    return f"https://wa.me/{digits}", ""


def _store_image(upload, *, alt_text, user):
    try:
        content, size, extension = prepare_catalog_image(upload)
    except ValidationError as exc:
        return None, exc.messages[0] if exc.messages else "L'image n'est pas acceptée."
    image = StoredImage(alt_text=(alt_text or "Image")[:200], uploaded_by=user, size=size)
    image.file.save(f"bibliotheque.{extension}", content, save=False)
    image.save()
    return image, ""


def _apply_general(library, data, files, user):
    name = str(data.get("name", library.name)).strip()
    if not name:
        return "Le nom de la bibliothèque est obligatoire."
    if len(name) > 200:
        return "Le nom est trop long."

    slogan = str(data.get("slogan", library.slogan)).strip()
    if len(slogan) > 255:
        return "Le slogan est trop long."

    address = str(data.get("address", library.address)).strip()
    if len(address) > 300:
        return "L'adresse est trop longue."

    city = str(data.get("city", library.city or "Kinshasa")).strip() or "Kinshasa"
    if len(city) > 120:
        return "La ville est trop longue."

    phone = str(data.get("phone", library.phone)).strip()
    if len(phone) > 40:
        return "Le téléphone est trop long."

    email = str(data.get("email", library.email)).strip()
    if not email:
        return "L'adresse électronique de contact est obligatoire."
    if len(email) > 254:
        return "L'adresse électronique est trop longue."

    website = str(data.get("website", library.website or "")).strip()
    if website:
        if not website.lower().startswith(("http://", "https://")):
            return "Le site web doit commencer par http:// ou https://."
        try:
            URLValidator()(website)
        except ValidationError:
            return "Le site web n'est pas une adresse valide."

    facebook_url, facebook_error = _optional_http_url(
        data.get("facebook_url", library.facebook_url or ""),
        label="Le lien Facebook",
    )
    if facebook_error:
        return facebook_error

    whatsapp_url, whatsapp_error = _optional_whatsapp(
        data.get("whatsapp_url", library.whatsapp_url or ""),
    )
    if whatsapp_error:
        return whatsapp_error

    maps_url, maps_error = _optional_http_url(
        data.get("maps_url", library.maps_url or ""),
        label="Le lien Google Maps",
    )
    if maps_error:
        return maps_error

    language = str(data.get("language", library.language)).strip()
    if language not in LANGUAGES:
        return "La langue choisie n'est pas disponible."

    theme = str(data.get("theme", library.theme)).strip()
    if theme not in THEMES:
        return "Le thème choisi n'est pas disponible."

    timezone = str(data.get("timezone", library.timezone)).strip()
    if timezone not in TIMEZONES:
        return "Le fuseau horaire choisi n'est pas disponible."

    date_format = str(data.get("date_format", library.date_format)).strip()
    if date_format not in DATE_FORMATS:
        return "Le format de date choisi n'est pas disponible."

    time_format = str(data.get("time_format", library.time_format)).strip()
    if time_format not in TIME_FORMATS:
        return "Le format d'heure choisi n'est pas disponible."

    try:
        page_size = int(data.get("page_size", library.page_size))
    except (TypeError, ValueError):
        return "Le nombre d'éléments par page n'est pas valide."
    if page_size not in PAGE_SIZES:
        return "Choisissez 10, 25 ou 50 éléments par page."

    dark_mode = _truthy(data.get("dark_mode", library.dark_mode))
    maintenance = _truthy(data.get("maintenance", library.maintenance))
    about = sanitize_rich_text(data.get("about", library.about))

    logo = library.logo
    if _truthy(data.get("clear_logo")):
        logo = None
    elif files.get("logo"):
        stored, error = _store_image(files["logo"], alt_text=f"Logo {name}", user=user)
        if error:
            return error
        logo = stored

    library.name = name
    library.slogan = slogan
    library.address = address
    library.city = city
    library.phone = phone
    library.email = email
    library.website = website
    library.facebook_url = facebook_url
    library.whatsapp_url = whatsapp_url
    library.maps_url = maps_url
    library.about = about
    library.logo = logo
    # Favicon = logo (plus de champ séparé dans l'interface).
    library.favicon = logo
    library.language = language
    library.theme = theme
    library.dark_mode = dark_mode
    library.timezone = timezone
    library.date_format = date_format
    library.time_format = time_format
    library.page_size = page_size
    library.maintenance = maintenance
    try:
        library.save()
    except ValidationError as exc:
        messages = []
        if hasattr(exc, "message_dict"):
            for values in exc.message_dict.values():
                messages.extend(values)
        elif hasattr(exc, "messages"):
            messages.extend(exc.messages)
        return messages[0] if messages else "L'enregistrement a été refusé."
    return ""


class LibrarySettingsView(APIView):
    authentication_classes = [CsrfEnforcedAuthentication]

    def get(self, request):
        if not request.user.has_perm("library_info.view_library"):
            return _fail("Accès refusé.", status=403)
        library = Library.get_solo()
        return Response(library_payload(library, staff=True))

    def patch(self, request):
        if not request.user.has_perm("library_info.change_library"):
            return _fail("Accès refusé.", status=403)
        library = Library.get_solo()
        error = _apply_general(library, request.data, request.FILES, request.user)
        if error:
            return _fail(error)
        record_staff_action(
            actor=request.user,
            action=ACTION_LIBRARY_UPDATED,
            target_type="library",
            target_id="1",
        )
        library.refresh_from_db()
        return Response(library_payload(library, staff=True))
