from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("analytics", "0001_sitevisit"),
    ]

    operations = [
        migrations.DeleteModel(name="SiteVisit"),
        migrations.CreateModel(
            name="TrafficEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("visitor_hash", models.CharField(db_index=True, max_length=64, verbose_name="empreinte du jour")),
                ("path", models.CharField(max_length=200, verbose_name="chemin")),
                ("page_kind", models.CharField(default="other", max_length=40, verbose_name="type de page")),
                ("book_id", models.PositiveIntegerField(blank=True, null=True, verbose_name="livre")),
                ("book_title", models.CharField(blank=True, default="", max_length=255, verbose_name="titre du livre")),
                ("category_id", models.PositiveIntegerField(blank=True, null=True, verbose_name="catégorie")),
                ("category_name", models.CharField(blank=True, default="", max_length=120, verbose_name="nom de catégorie")),
                ("search_term", models.CharField(blank=True, default="", max_length=80, verbose_name="recherche")),
                ("device", models.CharField(default="other", max_length=20, verbose_name="appareil")),
                ("origin", models.CharField(default="direct", max_length=20, verbose_name="origine")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="vu le")),
            ],
            options={
                "verbose_name": "événement de fréquentation",
                "verbose_name_plural": "événements de fréquentation",
                "ordering": ["-created_at"],
                "default_permissions": (),
                "permissions": [("view_sitestat", "Peut consulter les statistiques du site")],
            },
        ),
        migrations.CreateModel(
            name="DailyTraffic",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(unique=True, verbose_name="jour")),
                ("visits", models.PositiveIntegerField(default=0, verbose_name="visites")),
                ("unique_visitors", models.PositiveIntegerField(default=0, verbose_name="visiteurs uniques")),
            ],
            options={
                "verbose_name": "trafic journalier",
                "verbose_name_plural": "trafics journaliers",
                "ordering": ["-day"],
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="DailyPageStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("path", models.CharField(max_length=200, verbose_name="chemin")),
                ("label", models.CharField(max_length=120, verbose_name="libellé")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="vues")),
            ],
            options={
                "verbose_name": "page journalière",
                "verbose_name_plural": "pages journalières",
                "ordering": ["-day", "-hits"],
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="DailyBookStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("book_id", models.PositiveIntegerField(verbose_name="livre")),
                ("title", models.CharField(max_length=255, verbose_name="titre")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="vues")),
            ],
            options={
                "verbose_name": "livre journalier",
                "verbose_name_plural": "livres journaliers",
                "ordering": ["-day", "-hits"],
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="DailyCategoryStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("category_id", models.PositiveIntegerField(verbose_name="catégorie")),
                ("name", models.CharField(max_length=120, verbose_name="nom")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="vues")),
            ],
            options={
                "verbose_name": "catégorie journalière",
                "verbose_name_plural": "catégories journalières",
                "ordering": ["-day", "-hits"],
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="DailySearchStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("term", models.CharField(max_length=80, verbose_name="terme")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="occurrences")),
            ],
            options={
                "verbose_name": "recherche journalière",
                "verbose_name_plural": "recherches journalières",
                "ordering": ["-day", "-hits"],
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="DailyDeviceStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("device", models.CharField(max_length=20, verbose_name="appareil")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="vues")),
            ],
            options={
                "verbose_name": "appareil journalier",
                "verbose_name_plural": "appareils journaliers",
                "ordering": ["-day", "-hits"],
                "default_permissions": (),
            },
        ),
        migrations.CreateModel(
            name="DailyOriginStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField(db_index=True, verbose_name="jour")),
                ("origin", models.CharField(max_length=20, verbose_name="origine")),
                ("hits", models.PositiveIntegerField(default=0, verbose_name="vues")),
            ],
            options={
                "verbose_name": "origine journalière",
                "verbose_name_plural": "origines journalières",
                "ordering": ["-day", "-hits"],
                "default_permissions": (),
            },
        ),
        migrations.AddIndex(
            model_name="trafficevent",
            index=models.Index(fields=["day", "visitor_hash"], name="analytics_t_day_7c0f1a_idx"),
        ),
        migrations.AddIndex(
            model_name="trafficevent",
            index=models.Index(fields=["day", "path"], name="analytics_t_day_path_idx"),
        ),
        migrations.AddConstraint(
            model_name="dailypagestat",
            constraint=models.UniqueConstraint(fields=("day", "path"), name="analytics_dailypage_day_path"),
        ),
        migrations.AddConstraint(
            model_name="dailybookstat",
            constraint=models.UniqueConstraint(fields=("day", "book_id"), name="analytics_dailybook_day_book"),
        ),
        migrations.AddConstraint(
            model_name="dailycategorystat",
            constraint=models.UniqueConstraint(fields=("day", "category_id"), name="analytics_dailycat_day_cat"),
        ),
        migrations.AddConstraint(
            model_name="dailysearchstat",
            constraint=models.UniqueConstraint(fields=("day", "term"), name="analytics_dailysearch_day_term"),
        ),
        migrations.AddConstraint(
            model_name="dailydevicestat",
            constraint=models.UniqueConstraint(fields=("day", "device"), name="analytics_dailydevice_day_dev"),
        ),
        migrations.AddConstraint(
            model_name="dailyoriginstat",
            constraint=models.UniqueConstraint(fields=("day", "origin"), name="analytics_dailyorigin_day_ori"),
        ),
    ]
