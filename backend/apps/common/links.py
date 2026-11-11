"""Adresses externes acceptées : http ou https, rien d'autre."""


def http_url(value):
    text = str(value or "").strip()
    if not text:
        return ""
    lowered = text.lower()
    if lowered.startswith("https://") or lowered.startswith("http://"):
        return text[:500]
    return ""
