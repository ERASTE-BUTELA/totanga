from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.common.health import health

admin.site.site_header = "Totanga"
admin.site.site_title = "Administration Totanga"
admin.site.index_title = "Gestion de la bibliothèque"


def build_urlpatterns(*, django_admin, debug):
    """L'admin Django n'est monté que si le réglage l'autorise.

    En production ce réglage est faux, même si quelqu'un rallume DEBUG.
    Les fichiers déposés ne sont servis par Django qu'en développement.
    """

    patterns = [
        path("api/sante/", health),
        path("api/messages/", include("apps.visitor_messages.urls")),
        path("api/catalogue/", include("apps.catalog.public_urls")),
        path("api/annonces/", include("apps.announcements.public_urls")),
        path("api/evenements/", include("apps.events.public_urls")),
        path("api/bibliotheque/", include("apps.library_info.public_urls")),
        path("api/gestion/", include("apps.accounts.gestion_urls")),
        path("api/gestion/catalogue/", include("apps.catalog.gestion_urls")),
        path("api/gestion/", include("apps.announcements.gestion_urls")),
        path("api/gestion/", include("apps.events.gestion_urls")),
        path("api/gestion/", include("apps.library_info.gestion_urls")),
    ]
    if django_admin:
        patterns.insert(0, path("admin/", admin.site.urls))
    if debug:
        patterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    return patterns


urlpatterns = build_urlpatterns(
    django_admin=settings.ENABLE_DJANGO_ADMIN,
    debug=settings.DEBUG,
)
