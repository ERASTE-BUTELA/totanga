from django.db import migrations, models


def fill_codes_from_register(apps, schema_editor):
    Copy = apps.get_model("catalog", "Copy")
    RegisterRow = apps.get_model("catalog", "RegisterRow")
    for row in RegisterRow.objects.exclude(copy_id=None).iterator():
        Copy.objects.filter(pk=row.copy_id).update(
            code1=(row.code1 or "")[:40],
            code2=(row.code2 or "")[:40],
            code3=(row.code3 or "")[:40],
            code4=(row.code4 or "")[:40],
            dewey=(row.dewey or "")[:40],
        )


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_image_max_5mo"),
    ]

    operations = [
        migrations.AddField(
            model_name="copy",
            name="code1",
            field=models.CharField(blank=True, max_length=40, verbose_name="code1"),
        ),
        migrations.AddField(
            model_name="copy",
            name="code2",
            field=models.CharField(blank=True, max_length=40, verbose_name="code2"),
        ),
        migrations.AddField(
            model_name="copy",
            name="code3",
            field=models.CharField(blank=True, max_length=40, verbose_name="code3"),
        ),
        migrations.AddField(
            model_name="copy",
            name="code4",
            field=models.CharField(blank=True, max_length=40, verbose_name="code4"),
        ),
        migrations.AddField(
            model_name="copy",
            name="dewey",
            field=models.CharField(blank=True, max_length=40, verbose_name="Dewey"),
        ),
        migrations.RunPython(fill_codes_from_register, migrations.RunPython.noop),
    ]
