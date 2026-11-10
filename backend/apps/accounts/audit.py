from .models import StaffAction

ACTION_LOGIN = "connexion"
ACTION_LOGOUT = "deconnexion"
ACTION_LOGIN_REFUSED = "connexion_refusee"
ACTION_USER_CREATED = "creation_compte"


def record_staff_action(*, actor, action, target_type="", target_id=""):
    """Journal minimal : qui, quoi, quel objet, quand.

    Aucun mot de passe, clé, adresse électronique, adresse IP ni corps de message.
    """

    StaffAction.objects.create(
        actor=actor if getattr(actor, "pk", None) else None,
        action=action,
        target_type=target_type[:80],
        target_id=str(target_id)[:64] if target_id else "",
    )
