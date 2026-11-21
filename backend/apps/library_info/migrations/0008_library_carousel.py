import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0007_copy_codes"),
        ("library_info", "0007_library_functioning"),
    ]

    operations = [
        migrations.CreateModel(
            name="LibraryCarouselImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("position", models.PositiveSmallIntegerField(default=0, verbose_name="ordre")),
                (
                    "image",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="library_carousel",
                        to="catalog.storedimage",
                        verbose_name="image",
                    ),
                ),
                (
                    "library",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="carousel_images",
                        to="library_info.library",
                        verbose_name="bibliothèque",
                    ),
                ),
            ],
            options={
                "verbose_name": "photo du carrousel",
                "verbose_name_plural": "photos du carrousel",
                "ordering": ("position", "id"),
            },
        ),
    ]
