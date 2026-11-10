import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="keywords",
            field=models.JSONField(blank=True, default=list, verbose_name="mots-clés"),
        ),
        migrations.AddField(
            model_name="book",
            name="page_count",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(20000),
                ],
                verbose_name="nombre de pages",
            ),
        ),
        migrations.AddField(
            model_name="book",
            name="published",
            field=models.BooleanField(
                default=True,
                help_text="Un brouillon reste enregistré, sans être proposé au public.",
                verbose_name="publié",
            ),
        ),
    ]
