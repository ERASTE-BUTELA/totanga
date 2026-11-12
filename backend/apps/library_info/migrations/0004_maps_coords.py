from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("library_info", "0003_maps_and_visitor_whatsapp"),
    ]

    operations = [
        migrations.AlterField(
            model_name="library",
            name="maps_url",
            field=models.CharField(
                blank=True,
                max_length=500,
                verbose_name="localisation Google Maps",
            ),
        ),
        migrations.AddField(
            model_name="library",
            name="latitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                verbose_name="latitude",
            ),
        ),
        migrations.AddField(
            model_name="library",
            name="longitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                verbose_name="longitude",
            ),
        ),
    ]
