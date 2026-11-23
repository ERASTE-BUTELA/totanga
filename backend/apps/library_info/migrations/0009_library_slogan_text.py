from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("library_info", "0008_library_carousel"),
    ]

    operations = [
        migrations.AlterField(
            model_name="library",
            name="slogan",
            field=models.TextField(
                blank=True,
                help_text="Texte du bandeau d'accueil (jusqu'à 2 000 caractères).",
                max_length=2000,
                verbose_name="slogan",
            ),
        ),
    ]
