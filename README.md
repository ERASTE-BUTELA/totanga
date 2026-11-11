# Totanga

Portail d'information de la bibliothèque Totanga (Kinshasa). Le backend Django, le site public React et l'administration React tournent dans Docker. Rien n'est installé sur la machine.

## Préparer

À la racine du projet, copier `.env.example` vers `.env` et remplacer la clé secrète ainsi que le mot de passe de la base.

## Développement

```powershell
docker compose up --build -d
```

Au démarrage, le conteneur attend la base, applique les migrations, synchronise les rôles, crée l'administrateur si les variables `DJANGO_SUPERUSER_*` sont renseignées et que ce compte n'existe pas encore, puis importe le répertoire s'il est vide. Le site public est sur http://localhost:5173/. L'administration du quotidien est sur http://localhost:5174/. L'admin Django `/admin/` n'est disponible qu'en développement.

En développement, les dossiers `backend`, `frontend` et `admin` sont partagés avec les conteneurs : un fichier modifié recharge le serveur correspondant.

## CI et déploiement

GitHub Actions exécute uniquement un **CI** (tests Django, tests et builds React) sur les pull requests et les pushes vers `main`. **Aucun déploiement automatique** : le VPS n’est jamais contacté par Actions. Le déploiement reste manuel ; voir [docs/deploiement.md](docs/deploiement.md).

## Production (préparation VPS)

La stack de production ne remplace pas le Nginx HTTPS de l'hôte. Elle expose uniquement des ports locaux pour qu'un reverse proxy s'y branche plus tard.

1. Renseigner `.env` avec les domaines (placeholders dans `.env.example`, domaine principal `bibtotanga.com`).
2. Pour un **essai local en HTTP**, ajouter dans `.env` :

```env
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081
DJANGO_SECURE_SSL_REDIRECT=false
```

3. Lancer (arrêter d'abord le compose de développement pour libérer les noms de projet / volumes si besoin) :

```powershell
docker compose -f docker-compose.production.yml --env-file .env up --build -d
```

| Service | Adresse locale |
| --- | --- |
| Site public | http://127.0.0.1:8080/ |
| Administration | http://127.0.0.1:8081/ |
| API (santé) | http://127.0.0.1:8000/api/sante/ |
| PostgreSQL | non publié hors Docker |

Vérifications utiles :

```powershell
curl.exe http://127.0.0.1:8000/api/sante/
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml exec backend python manage.py check --deploy
```

Sur le VPS, derrière Nginx HTTPS, remettre `DJANGO_SECURE_SSL_REDIRECT=true` et les origines `https://…` (sous-domaines à définir). Ne pas publier PostgreSQL. Les volumes `media_data` et `postgres_data` conservent les fichiers et la base.

## Suivre et arrêter

```powershell
docker compose logs -f backend
docker compose stop
```

En production :

```powershell
docker compose -f docker-compose.production.yml logs -f backend
docker compose -f docker-compose.production.yml stop
```

`docker compose stop` arrête les conteneurs et conserve les volumes. La commande qui efface la base est `docker compose down -v` : ne l'utilisez pas tant que les données doivent être gardées.
