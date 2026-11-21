"""Envoi des réponses du personnel aux messages de contact."""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.library_info.models import Library

REPLY_MAX_LENGTH = 2000
DEFAULT_WEBSITE = "https://www.bibtotanga.com"
DEFAULT_CONTACT_EMAIL = "support@bibtotanga.com"


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


def smtp_from_email():
    """Expéditeur SMTP : boîte configurée dans .env (Hostinger n'accepte que celle-ci)."""

    return settings.DEFAULT_FROM_EMAIL


def _is_placeholder_email(address):
    domain = address.rsplit("@", 1)[-1].lower()
    return domain.endswith(".test") or domain.endswith(".example") or domain == "example.com"


def library_reply_to(library=None):
    """Adresse de réponse éventuelle = e-mail public de la bibliothèque, s'il est réel."""

    library = library or Library.objects.filter(pk=1).first()
    if not library or not library.email:
        return []
    address = library.email.strip()
    if not address or "@" not in address or _is_placeholder_email(address):
        return []
    return [address]


def _contact_bits(library):
    library_name = (library.name if library and library.name else "Bibliothèque Totanga").strip()
    contact_email = DEFAULT_CONTACT_EMAIL
    if library and library.email and not _is_placeholder_email(library.email.strip()):
        contact_email = library.email.strip()

    website_url = DEFAULT_WEBSITE
    if library and library.website:
        website_url = library.website.strip()
    if not website_url.startswith(("http://", "https://")):
        website_url = f"https://{website_url}"
    website_label = website_url.replace("https://", "").replace("http://", "").rstrip("/")

    city = (library.city if library and library.city else "").strip()
    if city:
        location_label = f"{library_name}, {city}"
    else:
        location_label = f"{library_name}, RDC"

    return {
        "library_name": library_name,
        "contact_email": contact_email,
        "website_url": website_url,
        "website_label": website_label,
        "location_label": location_label,
    }


def _plain_reply(*, visitor_name, subject_label, question, reply, library_name, actor_name, contact):
    actor_line = f"\nRéponse envoyée par {actor_name}." if actor_name else ""
    return (
        f"Bonjour {visitor_name},\n\n"
        f"Merci pour votre message. Voici notre réponse à votre question :\n\n"
        f"Votre question ({subject_label}) :\n{question}\n\n"
        f"Notre réponse :\n{reply}\n\n"
        f"N'hésitez pas à nous contacter pour toute autre demande. "
        f"Nous restons à votre disposition.\n\n"
        f"—\n"
        f"{library_name}\n"
        f"Service de communication et d'assistance{actor_line}\n\n"
        f"{contact['contact_email']} | {contact['website_label']} | {contact['location_label']}\n"
    )


def build_reply_messages(*, message, reply_body, actor_name=""):
    """Construit le texte et le HTML du courriel (contenu échappé côté HTML)."""

    body = clean_reply_body(reply_body)
    if not body:
        raise ValueError("Indiquez une réponse (2 000 caractères maximum).")
    if not message.email:
        raise ValueError("Ce message n'a pas d'adresse électronique.")

    library = Library.objects.filter(pk=1).first()
    contact = _contact_bits(library)
    subject_label = message.get_subject_display()
    visitor_name = (message.name or "visiteur").strip() or "visiteur"
    question = (message.body or "").strip()
    if len(question) > 500:
        question = f"{question[:500]}…"

    subject = f"Réponse de {contact['library_name']} — {subject_label}"
    plain = _plain_reply(
        visitor_name=visitor_name,
        subject_label=subject_label,
        question=question,
        reply=body,
        library_name=contact["library_name"],
        actor_name=actor_name,
        contact=contact,
    )
    # Le template Django échappe le texte ; |linebreaksbr pour les retours à la ligne.
    html = render_to_string(
        "visitor_messages/email_reply.html",
        {
            "subject": subject,
            "visitor_name": visitor_name,
            "subject_label": subject_label,
            "question": question,
            "reply": body,
            "library_name": contact["library_name"],
            "actor_name": actor_name,
            "contact_email": contact["contact_email"],
            "website_url": contact["website_url"],
            "website_label": contact["website_label"],
            "location_label": contact["location_label"],
        },
    )
    return subject, plain, html, contact, library


def send_visitor_reply(*, message, reply_body, actor_name=""):
    """Envoie un courriel HTML + texte. Ne journalise ni l'adresse ni le texte."""

    if not email_sending_configured():
        raise RuntimeError("L'envoi de courriel n'est pas encore configuré.")

    subject, plain, html, _contact, library = build_reply_messages(
        message=message,
        reply_body=reply_body,
        actor_name=actor_name,
    )
    mail = EmailMultiAlternatives(
        subject=subject,
        body=plain,
        from_email=smtp_from_email(),
        to=[message.email],
        reply_to=library_reply_to(library) or None,
    )
    mail.attach_alternative(html, "text/html")
    mail.send(fail_silently=False)
