from django.db import migrations, models

FUNCTIONING_HTML = """
<h3>La bibliothèque</h3>
<p>Située au centre de trois grands complexes scolaires sur l'av. Kimpioka n. 3, dans le quartier de Kingasani II, la commune de Kimbanseke, Bibliothèque Totanga se présente aujourd'hui à ses lecteurs avec :</p>
<ul>
<li>Un bâtiment propre contenant la grande salle de lecture climatisée avec une capacité de 150 places, une grande étagère à deux niveaux conçue pour contenir jusqu'à 25 000 livres, une petite salle pour la consultation des répertoires papier et numérique, un petit entrepôt pour le matériel et les consommables quotidiens, le bureau des bibliothécaires pour la gestion des répertoires, des livres, des lecteurs et des prêts journaliers.</li>
<li>Personnel qualifié avec une longue expérience de travail en bibliothèque.</li>
<li>10 157 ouvrages publiés par les éditeurs et les universités plus importants des pays francophones, capables de couvrir l'ensemble de l'univers du savoir, et gérés à travers le répertoire organisé avec le système de classification Dewey.</li>
<li>Postes de travail équipés d'ordinateurs pour différents usages spécifiques :
<ul>
<li>Pour la recherche de livres</li>
<li>À libre utilisation des lecteurs pour la rédaction de textes, travaux de fin de cycle, mémoires, recherches, etc.</li>
<li>Pour la lecture des livres au format numérique</li>
</ul>
</li>
</ul>
<p>Les textes disponibles sont normalement au niveau universitaire et des écoles secondaires, afin de répondre au mieux aux besoins des élèves, des étudiants, des chercheurs et des professionnels. Un élan notable est donné par l'introduction des livres numériques, une technologie qui permet d'acquérir de nouveaux livres (et de les mettre à la disposition des lecteurs) instantanément, évitant ainsi les délais et les coûts de livraison.</p>
<p>De toute façon, lorsque la bibliothèque n'est pas en mesure de satisfaire les besoins de ses lecteurs, il suffit à ceux-ci de demander le titre ou le sujet pour avoir le livre dans un délai de quelques heures s'il est en format numérique ou de quelques semaines s'il s'agit d'un format papier.</p>
<p>En effet, l'attention portée aux indications et aux besoins de ses lecteurs ainsi que l'évaluation minutieuse des orientations exprimées par le corps enseignant des universités de la ville de Kinshasa ont permis à la bibliothèque de s'enrichir de plus en plus en nouveaux livres.</p>
<h3>Les horaires</h3>
<p>La bibliothèque s'ouvre :</p>
<ul>
<li>Du lundi au vendredi de 8 h 30 à 17 h 00</li>
</ul>
<h3>L'abonnement et les frais</h3>
<p>L'accès à la bibliothèque fait l'objet d'un abonnement trimestriel au prix de :</p>
<ul>
<li>Élèves : gratuit</li>
<li>Étudiants : 5 500 CDF / trimestre</li>
<li>Chercheurs : 7 500 CDF / trimestre</li>
</ul>
<p>En cas de renouvellement de l'abonnement dans les 5 jours suivant l'expiration, le prix du nouvel abonnement est réduit à :</p>
<ul>
<li>Élèves : gratuit</li>
<li>Étudiants : 4 000 CDF / trimestre</li>
<li>Chercheurs : 5 500 CDF / trimestre</li>
</ul>
""".strip()


def seed_functioning(apps, schema_editor):
    Library = apps.get_model("library_info", "Library")
    for library in Library.objects.all():
        if not (library.functioning or "").strip():
            library.functioning = FUNCTIONING_HTML
            library.save(update_fields=["functioning"])


def unseed_functioning(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("library_info", "0006_socials_hours_text"),
    ]

    operations = [
        migrations.AlterField(
            model_name="library",
            name="about",
            field=models.TextField(blank=True, verbose_name="histoire de la bibliothèque"),
        ),
        migrations.AddField(
            model_name="library",
            name="functioning",
            field=models.TextField(blank=True, verbose_name="structure et fonctionnement"),
        ),
        migrations.RunPython(seed_functioning, unseed_functioning),
    ]
