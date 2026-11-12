from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("visitor_messages", "0002_maps_and_visitor_whatsapp"),
    ]

    operations = [
        migrations.AddField(
            model_name="visitormessage",
            name="is_read",
            field=models.BooleanField(default=False, verbose_name="lu"),
        ),
    ]
