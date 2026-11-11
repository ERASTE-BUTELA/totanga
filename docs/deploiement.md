# CI et déploiement Totanga

## Principe

```text
Pull Request ───────► CI (GitHub Actions)
                        ├── Django
                        ├── Frontend
                        └── Admin

Push sur main ──────► CI (GitHub Actions)
                        ├── Django
                        ├── Frontend
                        └── Admin

Déploiement VPS ────► Manuel uniquement (jamais déclenché par GitHub)
```

- **GitHub Actions** vérifie automatiquement le code (tests et builds).
- **Un push sur `main` ne déploie jamais** l’application.
- **GitHub Actions ne contacte jamais le VPS** (pas de SSH, pas de secrets `VPS_*`).
- Le déploiement sur le VPS Hostinger se fait **à la main**, depuis le serveur.

Aucun secret de production n’entre dans Git ni dans les secrets GitHub du CI.

## Fichiers concernés

| Fichier | Rôle |
| --- | --- |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Seul workflow : CI Django + React |
| [`deploy/deploy.sh`](../deploy/deploy.sh) | Aide au déploiement **manuel** sur le VPS (jamais appelé par Actions) |
| [`docker-compose.production.yml`](../docker-compose.production.yml) | Stack Docker de production |
| [`.env.example`](../.env.example) | Modèle pour le `.env` **créé uniquement sur le VPS** |

## CI GitHub Actions

Déclencheurs : pull requests, pushes sur `main`, et lancement manuel (`workflow_dispatch`).

Trois jobs en parallèle :

1. **Backend** — Python 3.13, PostgreSQL 17 éphémère, variables factices de test  
2. **Frontend** — Node 24, `npm ci` / `npm test` / `npm run build`  
3. **Admin** — Node 24, idem  

Le test d’import réel du répertoire (`@tag real_repertoire`) est exclu (trop long).

Aucun secret GitHub n’est requis pour le CI. Les variables Django/Postgres du workflow sont des valeurs de test définies dans `ci.yml`, pas les secrets du VPS.

## Déploiement manuel sur le VPS

### Préparation (une seule fois)

1. Docker, Docker Compose, Nginx et HTTPS déjà en place sur le VPS.
2. Cloner le dépôt :

```bash
mkdir -p /home/watterdame/opt
cd /home/watterdame/opt
git clone git@github.com:ERASTE-BUTELA/totanga.git .
```

3. Créer `.env` **sur le serveur** (jamais dans Git) :

```bash
cp .env.example .env
nano .env
```

Renseigner `DJANGO_SECRET_KEY`, Postgres, hôtes HTTPS (`bibtotanga.com` + sous-domaines), `DJANGO_SECURE_SSL_REDIRECT=true`, compte admin, etc.

4. Premier démarrage :

```bash
chmod +x deploy/deploy.sh
docker compose -f docker-compose.production.yml --env-file .env up --build -d
curl -fsS http://127.0.0.1:8000/api/sante/
```

5. Nginx de l’hôte proxy vers `127.0.0.1:8080` (public), `8081` (admin), `8000` (API si besoin).

Ports Docker production :

| Service | Adresse |
| --- | --- |
| Site public | `127.0.0.1:8080` |
| Administration | `127.0.0.1:8081` |
| API | `127.0.0.1:8000` |
| PostgreSQL | non publié hors Docker |

### Mettre à jour le code (manuel)

Sur le VPS, après un merge sur `main` validé par la CI :

```bash
cd /home/watterdame/opt
git fetch origin
bash ./deploy/deploy.sh origin/main
# ou un SHA précis :
# bash ./deploy/deploy.sh <sha>

# Variante sans le script :
# git checkout main
# git pull --ff-only origin main
# docker compose -f docker-compose.production.yml --env-file .env build
# docker compose -f docker-compose.production.yml --env-file .env up -d --remove-orphans
# curl -fsS http://127.0.0.1:8000/api/sante/
```

Au démarrage du conteneur backend, `entrypoint.py` exécute migrate, sync_roles, create_admin (si besoin), import répertoire si vide, puis collectstatic.

`deploy/deploy.sh` reste utile pour un déploiement manuel cohérent (attente santé + rollback vers le commit précédent en cas d’échec). Il n’est **jamais** lancé par GitHub Actions.

### Rollback manuel

```bash
cd /home/watterdame/opt
bash ./deploy/deploy.sh <sha-stable>
```

Ne pas utiliser `docker compose down -v` : cela efface la base et les media.

## Vérifier le CI en local avant de pousser

Même logique que GitHub Actions (sans le service Postgres distant : utiliser le Postgres Docker du projet, ou un Postgres local).

**Backend** (avec la stack de développement déjà lancée, ou un Postgres accessible) :

```powershell
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py migrate --noinput
docker compose exec -T backend python manage.py test --exclude-tag=real_repertoire -v 1
```

**Frontend** :

```powershell
cd frontend
npm ci
npm test
npm run build
```

**Admin** :

```powershell
cd admin
npm ci
npm test
npm run build
```

Si ces commandes passent en local, le workflow CI a de bonnes chances de réussir sur GitHub.
