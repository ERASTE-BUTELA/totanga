from django.contrib.postgres.operations import TrigramExtension, UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0007_copy_codes"),
    ]

    operations = [
        UnaccentExtension(),
        TrigramExtension(),
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS catalog_publisher_name_trgm
            ON catalog_publisher USING gin (immutable_unaccent(lower(name)) gin_trgm_ops);

            CREATE INDEX IF NOT EXISTS catalog_copy_inventory_trgm
            ON catalog_copy USING gin (inventory_number gin_trgm_ops);

            CREATE INDEX IF NOT EXISTS catalog_copy_call_number_trgm
            ON catalog_copy USING gin (call_number gin_trgm_ops);

            CREATE INDEX IF NOT EXISTS catalog_copy_code1_trgm
            ON catalog_copy USING gin (code1 gin_trgm_ops);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS catalog_publisher_name_trgm;
            DROP INDEX IF EXISTS catalog_copy_inventory_trgm;
            DROP INDEX IF EXISTS catalog_copy_call_number_trgm;
            DROP INDEX IF EXISTS catalog_copy_code1_trgm;
            """,
        ),
    ]
