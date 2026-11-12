import django.db.models.deletion
from django.db import migrations, models


def copy_publishers(apps, schema_editor):
    Book = apps.get_model("catalog", "Book")
    Publisher = apps.get_model("catalog", "Publisher")
    cache = {}
    for book in Book.objects.exclude(publisher_name="").exclude(publisher_name__isnull=True).iterator():
        label = " ".join(str(book.publisher_name).split())[:200]
        if not label:
            continue
        key = label.casefold()
        publisher = cache.get(key)
        if publisher is None:
            publisher = Publisher.objects.filter(name__iexact=label).first()
            if publisher is None:
                publisher = Publisher.objects.create(name=label)
            cache[key] = publisher
        book.publisher_id = publisher.pk
        book.save(update_fields=["publisher"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0004_repertoire"),
    ]

    operations = [
        migrations.CreateModel(
            name="Publisher",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200, verbose_name="nom")),
                ("notes", models.TextField(blank=True, verbose_name="notes")),
            ],
            options={
                "verbose_name": "éditeur",
                "verbose_name_plural": "éditeurs",
                "ordering": ["name"],
            },
        ),
        migrations.RenameField(
            model_name="book",
            old_name="publisher",
            new_name="publisher_name",
        ),
        migrations.AddField(
            model_name="book",
            name="publisher",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="books",
                to="catalog.publisher",
                verbose_name="éditeur",
            ),
        ),
        migrations.RunPython(copy_publishers, noop_reverse),
        migrations.RemoveField(
            model_name="book",
            name="publisher_name",
        ),
    ]
