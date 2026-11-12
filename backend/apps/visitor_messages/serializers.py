from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import VisitorMessage


def plain_text(value):
    cleaned = " ".join(str(value).split())
    if "<" in cleaned or ">" in cleaned:
        raise serializers.ValidationError("Le texte ne peut pas contenir de balises.")
    return cleaned


def normalize_whatsapp(value):
    raw = str(value or "").strip()
    if not raw:
        return ""
    digits = "".join(character for character in raw if character.isdigit())
    if not (8 <= len(digits) <= 15):
        raise serializers.ValidationError(
            "Indiquez un numéro WhatsApp valide (ex. +243800000000)."
        )
    return digits


class VisitorMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitorMessage
        fields = ["name", "email", "whatsapp", "subject", "body"]

    def validate_name(self, value):
        cleaned = plain_text(value)
        if len(cleaned) < 2:
            raise serializers.ValidationError("Indiquez votre nom.")
        return cleaned

    def validate_email(self, value):
        cleaned = str(value or "").strip()
        if not cleaned:
            return ""
        try:
            validate_email(cleaned)
        except DjangoValidationError as exc:
            raise serializers.ValidationError("L'adresse électronique n'est pas valide.") from exc
        return cleaned

    def validate_whatsapp(self, value):
        return normalize_whatsapp(value)

    def validate_body(self, value):
        cleaned = plain_text(value)
        if len(cleaned) < 10:
            raise serializers.ValidationError("Le message est trop court.")
        return cleaned

    def validate(self, attrs):
        email = str(attrs.get("email") or "").strip()
        whatsapp = str(attrs.get("whatsapp") or "").strip()
        if not email and not whatsapp:
            raise serializers.ValidationError(
                "Indiquez une adresse électronique ou un numéro WhatsApp."
            )
        attrs["email"] = email
        attrs["whatsapp"] = whatsapp
        return attrs


class VisitorMessagePublicSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source="get_subject_display", read_only=True)

    class Meta:
        model = VisitorMessage
        fields = ["id", "name", "subject", "body", "created_at"]
