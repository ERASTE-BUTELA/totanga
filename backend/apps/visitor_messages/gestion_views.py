from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import ACTION_MESSAGE_REPLY, record_staff_action
from apps.accounts.authentication import CsrfEnforcedAuthentication

from .mail import clean_reply_body, send_visitor_reply
from .models import VisitorMessage, VisitorMessageReply
from .staff_serializers import serialize_message, serialize_reply


class StaffMessageReplyView(APIView):
    """Enregistre une réponse (courriel ou note WhatsApp) et conserve l'historique."""

    authentication_classes = [CsrfEnforcedAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        if not request.user.has_perm("visitor_messages.view_visitormessage"):
            return Response(
                {"detail": "Vous n'avez pas l'autorisation d'effectuer cette action."},
                status=403,
            )
        message = VisitorMessage.objects.filter(pk=message_id).first()
        if message is None:
            return Response({"detail": "Ce message n'existe pas."}, status=404)

        data = request.data if isinstance(request.data, dict) else {}
        channel = str(data.get("channel") or VisitorMessageReply.CHANNEL_EMAIL).strip().lower()
        if channel not in {VisitorMessageReply.CHANNEL_EMAIL, VisitorMessageReply.CHANNEL_WHATSAPP}:
            return Response({"detail": "Canal de réponse inconnu."}, status=400)

        reply = clean_reply_body(data.get("body"))
        if not reply:
            return Response(
                {"detail": "Indiquez une réponse (2 000 caractères maximum)."},
                status=400,
            )

        if channel == VisitorMessageReply.CHANNEL_EMAIL:
            if not message.email:
                return Response(
                    {"detail": "Ce message n'a pas d'adresse électronique."},
                    status=400,
                )
        elif not message.whatsapp:
            return Response(
                {"detail": "Ce message n'a pas de numéro WhatsApp."},
                status=400,
            )

        actor_name = request.user.get_full_name().strip() or request.user.get_username()

        if channel == VisitorMessageReply.CHANNEL_EMAIL:
            try:
                send_visitor_reply(message=message, reply_body=reply, actor_name=actor_name)
            except ValueError as error:
                return Response({"detail": str(error)}, status=400)
            except RuntimeError as error:
                return Response({"detail": str(error)}, status=503)
            except Exception:
                return Response(
                    {"detail": "Le courriel n'a pas pu être envoyé. Réessayez plus tard."},
                    status=502,
                )

        stored = VisitorMessageReply.objects.create(
            message=message,
            body=reply,
            channel=channel,
            actor=request.user,
            actor_name=actor_name[:120],
        )

        if not message.is_read:
            message.is_read = True
            message.save(update_fields=["is_read"])

        record_staff_action(
            actor=request.user,
            action=ACTION_MESSAGE_REPLY,
            target_type="visitor_messages.VisitorMessage",
            target_id=message.pk,
        )
        return Response(
            {
                "ok": True,
                "id": message.pk,
                "is_read": True,
                "unread_count": VisitorMessage.objects.filter(is_read=False).count(),
                "reply": serialize_reply(stored),
                "message": serialize_message(message, replies=list(message.replies.all())),
            }
        )
