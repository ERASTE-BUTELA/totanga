"""Sérialisation des messages visiteurs pour l'administration (personnel uniquement)."""


def serialize_reply(reply):
    return {
        "id": reply.pk,
        "body": reply.body,
        "channel": reply.channel,
        "channel_label": reply.get_channel_display(),
        "actor_name": reply.actor_name or "",
        "created_at": reply.created_at.isoformat(),
    }


def serialize_message(message, *, replies=None):
    if replies is None:
        replies = list(message.replies.all())
    return {
        "id": message.pk,
        "kind": message.kind,
        "kind_label": message.get_kind_display(),
        "name": message.name,
        "email": message.email or "",
        "whatsapp": message.whatsapp or "",
        "subject": message.get_subject_display(),
        "body": message.body,
        "is_read": bool(message.is_read),
        "created_at": message.created_at.isoformat(),
        "contact_key": message.contact_key(),
        "reply_count": len(replies),
        "replies": [serialize_reply(reply) for reply in replies],
    }
