from rest_framework.authentication import SessionAuthentication


class CsrfEnforcedAuthentication(SessionAuthentication):
    """Vérifie le jeton CSRF même lorsqu'aucun visiteur n'est connecté.

    DRF marque ses vues comme exemptées. Sans cette classe, une requête
    anonyme (connexion, message) échapperait au contrôle.
    L'en-tête d'authentification garde le refus d'une session absente en 401.
    Un rôle sans droit reste un 403.
    """

    def authenticate_header(self, request):
        return "Session"

    def authenticate(self, request):
        self.enforce_csrf(request)
        user = getattr(request._request, "user", None)
        if not user or not user.is_active:
            return None
        return (user, None)
