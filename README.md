# Totanga

Portail d'information de la bibliothèque Totanga (Kinshasa). Le backend Django et le site public React tournent dans Docker. Rien n'est installé sur la machine.

## Préparer

À la racine du projet, copier `.env.example` vers `.env` (un `.env` de développement est déjà fourni) et remplacer la clé secrète ainsi que le mot de passe de la base.

## Lancer

```powershell
docker compose up --build -d
```

Au démarrage, le conteneur attend la base, applique les migrations, puis crée l'administrateur si les variables `DJANGO_SUPERUSER_*` sont renseignées et que ce compte n'existe pas encore. Le site public est accessible sur http://localhost:5173/. L'administration est accessible sur http://localhost:8000/admin/.

En production, utilisez un mot de passe fort et changez-le après la première connexion. Un redémarrage ne remplace pas le mot de passe d'un compte déjà créé.

En développement, les dossiers `backend` et `frontend` sont partagés avec les conteneurs : un fichier modifié recharge le serveur correspondant.

## Suivre et arrêter

```powershell
docker compose logs -f backend
docker compose stop
```

`docker compose stop` arrête les conteneurs et conserve le volume `postgres_data`. La base reste en place au prochain démarrage. La commande qui efface la base est `docker compose down -v` : ne l'utilisez pas tant que les données doivent être gardées.
