from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("visitor_messages", "0003_visitormessage_is_read"),
    ]

    operations = [
        migrations.AddField(
            model_name="visitormessage",
            name="kind",
            field=models.CharField(
                choices=[("contact", "Message de contact"), ("avis", "Avis sur la bibliothèque")],
                db_index=True,
                default="contact",
                max_length=20,
                verbose_name="type",
            ),
        ),
        migrations.AlterField(
            model_name="visitormessage",
            name="subject",
            field=models.CharField(
                choices=[
                    ("generale", "Question générale"),
                    ("horaires", "Horaires et services"),
                    ("catalogue", "Catalogue"),
                    ("evenement", "Événement"),
                    ("autre", "Autre"),
                    ("avis", "Avis sur la bibliothèque"),
                ],
                max_length=20,
                verbose_name="sujet",
            ),
        ),
    ]
