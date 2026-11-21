import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("visitor_messages", "0004_visitormessage_kind"),
    ]

    operations = [
        migrations.CreateModel(
            name="VisitorMessageReply",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField(max_length=2000, verbose_name="réponse")),
                (
                    "channel",
                    models.CharField(
                        choices=[("email", "Courriel"), ("whatsapp", "WhatsApp")],
                        default="email",
                        max_length=20,
                        verbose_name="canal",
                    ),
                ),
                ("actor_name", models.CharField(blank=True, max_length=120, verbose_name="nom affiché")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="envoyé le")),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="visitor_message_replies",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="auteur",
                    ),
                ),
                (
                    "message",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replies",
                        to="visitor_messages.visitormessage",
                        verbose_name="message",
                    ),
                ),
            ],
            options={
                "verbose_name": "réponse à un message visiteur",
                "verbose_name_plural": "réponses aux messages visiteurs",
                "ordering": ["created_at"],
            },
        ),
    ]
