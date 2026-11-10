from django.apps import AppConfig


class VisitorMessagesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.visitor_messages"
    label = "visitor_messages"
    verbose_name = "Messages des visiteurs"
