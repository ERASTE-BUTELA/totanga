"""Sérialisation de la fiche bibliothèque."""


def _media(field):
    if not field:
        return ""
    url = field.url
    return url if url.startswith("/") else f"/{url}"


def _social_links(library):
    links = []
    if library.facebook_url:
        links.append({"label": "Facebook", "url": library.facebook_url})
    if library.whatsapp_url:
        links.append({"label": "WhatsApp", "url": library.whatsapp_url})
    return links


def library_payload(library, *, staff=False):
    data = {
        "name": library.name,
        "slogan": library.slogan,
        "address": library.address,
        "city": library.city,
        "phone": library.phone,
        "email": library.email,
        "website": library.website or "",
        "facebook_url": library.facebook_url or "",
        "whatsapp_url": library.whatsapp_url or "",
        "maps_url": library.maps_url or "",
        "about": library.about,
        "logo": _media(library.logo.file) if library.logo_id else "",
        # Le favicon du site suit toujours le logo.
        "favicon": _media(library.logo.file) if library.logo_id else "",
        "language": library.language,
        "theme": library.theme,
        "dark_mode": library.dark_mode,
        "timezone": library.timezone,
        "date_format": library.date_format,
        "time_format": library.time_format,
        "page_size": library.page_size,
        "maintenance": library.maintenance,
        "notice": "",
        "hours_summary": "",
        "opening_hours": [],
        "social_links": _social_links(library),
    }
    if staff:
        data["updated_at"] = library.updated_at.isoformat() if library.updated_at else ""
    return data
