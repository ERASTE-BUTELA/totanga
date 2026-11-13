"""Classement appareil et origine à partir d'en-têtes, sans les conserver."""

from urllib.parse import urlparse

DEVICE_MOBILE = "mobile"
DEVICE_TABLET = "tablet"
DEVICE_DESKTOP = "desktop"
DEVICE_OTHER = "other"

ORIGIN_DIRECT = "direct"
ORIGIN_WHATSAPP = "whatsapp"
ORIGIN_FACEBOOK = "facebook"
ORIGIN_SEARCH = "search"
ORIGIN_OTHER = "other"

DEVICE_LABELS = {
    DEVICE_MOBILE: "Mobile",
    DEVICE_TABLET: "Tablette",
    DEVICE_DESKTOP: "Ordinateur",
    DEVICE_OTHER: "Autre",
}

ORIGIN_LABELS = {
    ORIGIN_DIRECT: "Direct",
    ORIGIN_WHATSAPP: "WhatsApp",
    ORIGIN_FACEBOOK: "Facebook",
    ORIGIN_SEARCH: "Moteur de recherche",
    ORIGIN_OTHER: "Autre",
}

SEARCH_HOST_MARKERS = (
    "google.",
    "bing.",
    "yahoo.",
    "duckduckgo.",
    "ecosia.",
    "qwant.",
    "baidu.",
    "yandex.",
)


def classify_device(user_agent):
    text = str(user_agent or "").lower()
    if not text:
        return DEVICE_OTHER
    if "ipad" in text or "tablet" in text or ("android" in text and "mobile" not in text):
        return DEVICE_TABLET
    if "mobi" in text or "iphone" in text or "android" in text:
        return DEVICE_MOBILE
    if "windows" in text or "macintosh" in text or "linux" in text or "cros" in text:
        return DEVICE_DESKTOP
    return DEVICE_OTHER


def classify_origin(referrer, *, site_hosts=()):
    raw = str(referrer or "").strip()
    if not raw:
        return ORIGIN_DIRECT
    try:
        host = (urlparse(raw).hostname or "").lower()
    except ValueError:
        return ORIGIN_OTHER
    if not host:
        return ORIGIN_DIRECT
    for own in site_hosts:
        own = str(own or "").lower().lstrip(".")
        if own and (host == own or host.endswith(f".{own}")):
            return ORIGIN_DIRECT
    if "whatsapp." in host or host.endswith("wa.me") or host == "wa.me":
        return ORIGIN_WHATSAPP
    if "facebook." in host or host.endswith(".fb.com") or host == "fb.com" or "fbcdn." in host:
        return ORIGIN_FACEBOOK
    if any(marker in host for marker in SEARCH_HOST_MARKERS):
        return ORIGIN_SEARCH
    return ORIGIN_OTHER
