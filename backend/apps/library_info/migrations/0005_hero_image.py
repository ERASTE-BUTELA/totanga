from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_image_max_5mo"),
        ("library_info", "0004_maps_coords"),
    ]

    operations = [
        migrations.AddField(
            model_name="library",
            name="hero_image",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="library_heroes",
                to="catalog.storedimage",
                verbose_name="image du bandeau d'accueil",
            ),
        ),
    ]
