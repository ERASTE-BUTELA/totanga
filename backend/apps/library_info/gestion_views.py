"""API du personnel pour la fiche bibliothèque et les réglages généraux."""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authentication import CsrfEnforcedAuthentication
from apps.accounts.audit import record_staff_action
from apps.catalog.models import StoredImage
from apps.catalog.validators import prepare_catalog_image

from .html import sanitize_rich_text
from .models import Library, LibraryCarouselImage
from .serializers import library_payload

ACTION_LIBRARY_UPDATED = "mise_a_jour_bibliotheque"
CAROUSEL_MAX = 6

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


def _optional_maps_location(value):
    raw = str(value or "").strip()
    if not raw:
        return "", ""
    if "<" in raw or ">" in raw:
        return "", "La localisation ne peut pas contenir de balises."
    if len(raw) > 500:
        return "", "La localisation est trop longue."
    if raw.lower().startswith(("http://", "https://")):
        return _optional_http_url(raw, label="Le lien Google Maps")
    return raw, ""


def _optional_coords(latitude_raw, longitude_raw):
    lat_text = "" if latitude_raw in (None, "") else str(latitude_raw).strip()
    lng_text = "" if longitude_raw in (None, "") else str(longitude_raw).strip()
    if not lat_text and not lng_text:
        return None, None, ""
    if not lat_text or not lng_text:
        return None, None, "Indiquez la latitude et la longitude ensemble, ou laissez les deux vides."
    try:
        latitude = Decimal(lat_text)
        longitude = Decimal(lng_text)
    except (InvalidOperation, TypeError, ValueError):
        return None, None, "Les coordonnées Google Maps ne sont pas valides."
    if not (Decimal("-90") <= latitude <= Decimal("90") and Decimal("-180") <= longitude <= Decimal("180")):
        return None, None, "Les coordonnées Google Maps sont hors limites."
    quant = Decimal("0.000001")
    return (
        latitude.quantize(quant, rounding=ROUND_HALF_UP),
        longitude.quantize(quant, rounding=ROUND_HALF_UP),
        "",
    )


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

    slogan = str(data.get("slogan", library.slogan)).replace("\r\n", "\n").replace("\r", "\n").strip()
    if len(slogan) > 1500:
        return "Le slogan est trop long (1 500 caractères maximum)."

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

    youtube_url, youtube_error = _optional_http_url(
        data.get("youtube_url", library.youtube_url or ""),
        label="Le lien YouTube",
    )
    if youtube_error:
        return youtube_error

    instagram_url, instagram_error = _optional_http_url(
        data.get("instagram_url", library.instagram_url or ""),
        label="Le lien Instagram",
    )
    if instagram_error:
        return instagram_error

    tiktok_url, tiktok_error = _optional_http_url(
        data.get("tiktok_url", library.tiktok_url or ""),
        label="Le lien TikTok",
    )
    if tiktok_error:
        return tiktok_error

    hours_text = str(data.get("hours_text", library.hours_text or "")).strip()
    if "<" in hours_text or ">" in hours_text:
        return "Les horaires ne peuvent pas contenir de balises."
    if len(hours_text) > 300:
        return "Les horaires sont trop longs (300 caractères maximum)."

    maps_url, maps_error = _optional_maps_location(
        data.get("maps_url", library.maps_url or ""),
    )
    if maps_error:
        return maps_error

    latitude, longitude, coords_error = _optional_coords(
        data.get("latitude", library.latitude),
        data.get("longitude", library.longitude),
    )
    if coords_error:
        return coords_error

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
    functioning = sanitize_rich_text(data.get("functioning", library.functioning))

    logo = library.logo
    if _truthy(data.get("clear_logo")):
        logo = None
    elif files.get("logo"):
        stored, error = _store_image(files["logo"], alt_text=f"Logo {name}", user=user)
        if error:
            return error
        logo = stored

    hero_image = library.hero_image
    if _truthy(data.get("clear_hero_image")):
        hero_image = None
    elif files.get("hero_image"):
        stored, error = _store_image(
            files["hero_image"],
            alt_text=f"Bandeau d'accueil {name}",
            user=user,
        )
        if error:
            return error
        hero_image = stored

    carousel_error = _apply_carousel(library, data, files, user, library_name=name)
    if carousel_error:
        return carousel_error

    library.name = name
    library.slogan = slogan
    library.address = address
    library.city = city
    library.phone = phone
    library.email = email
    library.website = website
    library.facebook_url = facebook_url
    library.whatsapp_url = whatsapp_url
    library.youtube_url = youtube_url
    library.instagram_url = instagram_url
    library.tiktok_url = tiktok_url
    library.hours_text = hours_text
    library.maps_url = maps_url
    library.latitude = latitude
    library.longitude = longitude
    library.about = about
    library.functioning = functioning
    library.logo = logo
    # Favicon = logo (plus de champ séparé dans l'interface).
    library.favicon = logo
    library.hero_image = hero_image
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


def _apply_carousel(library, data, files, user, *, library_name):
    """Conserve les ids listés, ajoute les nouveaux fichiers, plafonne à CAROUSEL_MAX."""

    keep_raw = str(data.get("carousel_keep", "")).strip()
    if "carousel_keep" not in data and not files.getlist("carousel_images"):
        return ""

    keep_ids = []
    for part in keep_raw.split(","):
        part = part.strip()
        if not part:
            continue
        if not part.isdigit():
            return "La liste des photos du carrousel est invalide."
        keep_ids.append(int(part))

    existing = {
        row.pk: row
        for row in library.carousel_images.select_related("image").all()
    }
    for pk in keep_ids:
        if pk not in existing:
            return "Une photo du carrousel est introuvable."

    remove_ids = [pk for pk in existing if pk not in keep_ids]
    if remove_ids:
        LibraryCarouselImage.objects.filter(library=library, pk__in=remove_ids).delete()

    new_files = files.getlist("carousel_images") if hasattr(files, "getlist") else []
    created = []
    for upload in new_files:
        if not upload:
            continue
        stored, error = _store_image(
            upload,
            alt_text=f"Carrousel {library_name}",
            user=user,
        )
        if error:
            return error
        created.append(stored)

    total = len(keep_ids) + len(created)
    if total > CAROUSEL_MAX:
        return f"Le carrousel accepte au plus {CAROUSEL_MAX} photos."

    position = 0
    for pk in keep_ids:
        LibraryCarouselImage.objects.filter(pk=pk, library=library).update(position=position)
        position += 1
    for stored in created:
        LibraryCarouselImage.objects.create(
            library=library,
            image=stored,
            position=position,
        )
        position += 1
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
