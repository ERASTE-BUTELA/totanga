from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("library_info", "0009_library_slogan_text"),
    ]

    operations = [
        migrations.AlterField(
            model_name="library",
            name="slogan",
            field=models.TextField(
                blank=True,
                help_text="Texte du bandeau d'accueil (jusqu'à 1 500 caractères).",
                max_length=1500,
                verbose_name="slogan",
            ),
        ),
    ]
