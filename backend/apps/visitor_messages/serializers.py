from rest_framework import serializers

from .models import VisitorMessage


def plain_text(value):
    cleaned = " ".join(str(value).split())
    if "<" in cleaned or ">" in cleaned:
        raise serializers.ValidationError("Le texte ne peut pas contenir de balises.")
    return cleaned


class VisitorMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitorMessage
        fields = ["name", "email", "subject", "body"]

    def validate_name(self, value):
        cleaned = plain_text(value)
        if len(cleaned) < 2:
            raise serializers.ValidationError("Indiquez votre nom.")
        return cleaned

    def validate_body(self, value):
        cleaned = plain_text(value)
        if len(cleaned) < 10:
            raise serializers.ValidationError("Le message est trop court.")
        return cleaned


class VisitorMessagePublicSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source="get_subject_display", read_only=True)

    class Meta:
        model = VisitorMessage
        fields = ["id", "name", "subject", "body", "created_at"]
