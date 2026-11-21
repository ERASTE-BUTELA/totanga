from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("library_info", "0005_hero_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="library",
            name="youtube_url",
            field=models.URLField(blank=True, verbose_name="YouTube"),
        ),
        migrations.AddField(
            model_name="library",
            name="instagram_url",
            field=models.URLField(blank=True, verbose_name="Instagram"),
        ),
        migrations.AddField(
            model_name="library",
            name="tiktok_url",
            field=models.URLField(blank=True, verbose_name="TikTok"),
        ),
        migrations.AddField(
            model_name="library",
            name="hours_text",
            field=models.CharField(
                blank=True,
                help_text="Texte libre, ex. Lundi à vendredi 8 h – 17 h",
                max_length=300,
                verbose_name="horaires d'ouverture",
            ),
        ),
    ]
