from django.db import migrations, models


def copy_legacy_counts(apps, schema_editor):
    DailyTraffic = apps.get_model("analytics", "DailyTraffic")
    for row in DailyTraffic.objects.all():
        # Ancien « visits » = pages vues ; visiteurs déjà dans unique_visitors.
        page_views = int(getattr(row, "visits", 0) or 0)
        visitors = int(getattr(row, "unique_visitors", 0) or 0)
        row.page_views = page_views
        row.visitors = visitors
        # Sans recalcul fin des séjours : une borne basse (au moins un séjour par visiteur).
        row.visits = visitors
        row.save(update_fields=["page_views", "visitors", "visits"])


class Migration(migrations.Migration):
    dependencies = [
        ("analytics", "0002_statistics"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailytraffic",
            name="page_views",
            field=models.PositiveIntegerField(default=0, verbose_name="pages vues"),
        ),
        migrations.AddField(
            model_name="dailytraffic",
            name="visitors",
            field=models.PositiveIntegerField(default=0, verbose_name="visiteurs"),
        ),
        migrations.RunPython(copy_legacy_counts, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="dailytraffic",
            name="unique_visitors",
        ),
        migrations.AlterField(
            model_name="dailytraffic",
            name="visits",
            field=models.PositiveIntegerField(default=0, verbose_name="visites"),
        ),
    ]
