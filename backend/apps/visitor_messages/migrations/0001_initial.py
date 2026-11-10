from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="VisitorMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80, verbose_name="nom")),
                ("email", models.EmailField(max_length=254, verbose_name="adresse électronique")),
                ("subject", models.CharField(choices=[("generale", "Question générale"), ("horaires", "Horaires et services"), ("catalogue", "Catalogue"), ("evenement", "Événement"), ("autre", "Autre")], max_length=20, verbose_name="sujet")),
                ("body", models.TextField(max_length=1000, verbose_name="message")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="envoyé le")),
            ],
            options={
                "verbose_name": "message d'un visiteur",
                "verbose_name_plural": "messages des visiteurs",
                "ordering": ["-created_at"],
            },
        ),
    ]
