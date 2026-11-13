from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SiteVisit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visitor_key", models.CharField(db_index=True, max_length=36, verbose_name="clé anonyme")),
                ("path", models.CharField(db_index=True, max_length=200, verbose_name="chemin")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="vue le")),
            ],
            options={
                "verbose_name": "visite",
                "verbose_name_plural": "visites",
                "ordering": ["-created_at"],
                "default_permissions": (),
            },
        ),
        migrations.AddIndex(
            model_name="sitevisit",
            index=models.Index(fields=["created_at", "visitor_key"], name="analytics_s_created_2b0d4a_idx"),
        ),
    ]
