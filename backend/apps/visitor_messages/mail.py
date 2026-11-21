"""Envoi des réponses du personnel aux messages de contact."""

from django.conf import settings
from django.core.mail import send_mail

from apps.library_info.models import Library

REPLY_MAX_LENGTH = 2000


def clean_reply_body(value):
    if not isinstance(value, str):
        return ""
    text = "\n".join(line.rstrip() for line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n"))
    text = text.strip()
    if not text or len(text) > REPLY_MAX_LENGTH:
        return ""
    if any(ord(character) < 9 or 10 < ord(character) < 32 for character in text):
        return ""
    return text


def email_sending_configured():
    """SMTP réel, ou backend de test / console en développement."""

    backend = getattr(settings, "EMAIL_BACKEND", "")
    if "locmem" in backend:
        return True
    if settings.EMAIL_HOST:
        return True
    # Console uniquement en développement : en production sans SMTP, l'envoi est refusé.
    return bool(settings.DEBUG) and "console" in backend


def library_from_email():
    library = Library.objects.filter(pk=1).first()
    if library and library.email:
        name = (library.name or "Bibliothèque Totanga").strip()
        return f"{name} <{library.email}>"
    return settings.DEFAULT_FROM_EMAIL


def send_visitor_reply(*, message, reply_body, actor_name=""):
    """Envoie un courriel en clair. Ne journalise ni l'adresse ni le texte."""

    body = clean_reply_body(reply_body)
    if not body:
        raise ValueError("Indiquez une réponse (2 000 caractères maximum).")
    if not message.email:
        raise ValueError("Ce message n'a pas d'adresse électronique.")
    if not email_sending_configured():
        raise RuntimeError("L'envoi de courriel n'est pas encore configuré.")

    library = Library.objects.filter(pk=1).first()
    library_name = (library.name if library and library.name else "Bibliothèque Totanga").strip()
    subject_label = message.get_subject_display()
    original = (message.body or "").strip()
    if len(original) > 500:
        original = f"{original[:500]}…"

    actor_line = f"\nRéponse envoyée par {actor_name}." if actor_name else ""
    payload = (
        f"Bonjour {message.name},\n\n"
        f"{body}\n\n"
        f"—\n"
        f"{library_name}{actor_line}\n\n"
        f"Vous aviez écrit ({subject_label}) :\n"
        f"{original}\n"
    )
    send_mail(
        subject=f"Réponse de {library_name} — {subject_label}",
        message=payload,
        from_email=library_from_email(),
        recipient_list=[message.email],
        fail_silently=False,
    )
