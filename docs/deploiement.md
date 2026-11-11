# Déploiement Totanga (GitHub → VPS Hostinger)

Ce document décrit la CI/CD GitHub Actions et la préparation du VPS. Aucun secret de production n’entre dans Git : ils vivent dans les **GitHub Secrets** (accès SSH) et dans le **`.env` du VPS**.

## Architecture

```text
Push / PR ──► GitHub Actions CI (tests + builds)
                    │
Push sur main ──────┴──► Deploy (SSH) ──► VPS
                                            git fetch + checkout SHA
                                            docker compose production
                                            migrate + collectstatic (entrypoint)
```

Sur le VPS, Nginx HTTPS de l’hôte pointe déjà vers :

| Service | Port local Docker |
| --- | --- |
| Site public | `127.0.0.1:8080` |
| Administration | `127.0.0.1:8081` |
| API | `127.0.0.1:8000` |
| PostgreSQL | non publié |

## Fichiers du pipeline

| Fichier | Rôle |
| --- | --- |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Tests Django, tests/build React (public + admin) |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Après CI OK sur `main` : SSH + déploiement |
| [`deploy/deploy.sh`](../deploy/deploy.sh) | Script exécuté **sur le VPS** (build, up, santé, rollback) |
| [`docker-compose.production.yml`](../docker-compose.production.yml) | Stack production |

## Préparation une seule fois sur le VPS

1. Installer Docker, Docker Compose, Nginx et les certificats HTTPS (déjà fait).
2. Créer un utilisateur de déploiement (ex. `deploy`) membre du groupe `docker`.
3. Cloner le dépôt GitHub (clé de déploiement en lecture seule recommandée) :

```bash
sudo mkdir -p /var/www/totanga
sudo chown deploy:deploy /var/www/totanga
cd /var/www/totanga
git clone git@github.com:ERASTE-BUTELA/totanga.git .
```

4. Créer `.env` **sur le serveur uniquement** à partir de `.env.example` :

```bash
cp .env.example .env
nano .env
```

Renseigner au minimum : `DJANGO_SECRET_KEY`, mots de passe Postgres, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` (HTTPS `bibtotanga.com` + futurs sous-domaines), `DJANGO_SECURE_SSL_REDIRECT=true`, compte admin `DJANGO_SUPERUSER_*`.

5. Premier lancement manuel :

```bash
chmod +x deploy/deploy.sh
docker compose -f docker-compose.production.yml --env-file .env up --build -d
curl -fsS http://127.0.0.1:8000/api/sante/
```

6. Configurer Nginx hôte pour proxy vers `8080` / `8081` / `8000` (hors scope de ce dépôt pour l’instant).

7. Autoriser GitHub Actions : clé SSH **privée** dans les secrets, clé **publique** dans `~/.ssh/authorized_keys` de l’utilisateur `deploy`.

## GitHub Secrets

Dans le dépôt : **Settings → Secrets and variables → Actions**.  
Créer aussi l’environnement nommé `production` (référencé par le workflow Deploy).

| Secret | Contenu |
| --- | --- |
| `VPS_HOST` | Adresse IP ou nom d’hôte du VPS |
| `VPS_USER` | Utilisateur SSH (ex. `deploy`) |
| `VPS_SSH_PRIVATE_KEY` | Clé privée OpenSSH complète (avec en-têtes `BEGIN` / `END`) |
| `VPS_APP_DIR` | Chemin absolu du clone (ex. `/var/www/totanga`) |
| `VPS_SSH_PORT` | Optionnel, défaut `22` |
| `VPS_SSH_KNOWN_HOSTS` | Optionnel ; sortie de `ssh-keyscan -H host`. Sinon le workflow appelle `ssh-keyscan` |

Les secrets applicatifs (`DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, etc.) **ne vont pas** dans GitHub Actions : ils restent dans le `.env` du VPS.

## Fonctionnement du pipeline

### CI (chaque pull request, et avant chaque déploiement)

1. **Backend** : Python 3.13, PostgreSQL 17 éphémère, `manage.py check`, migrations, `manage.py test apps --exclude-tag=real_repertoire`.
2. **Frontend** : `npm ci`, `npm test`, `npm run build`.
3. **Admin** : idem.

Le test d’import réel du répertoire (`@tag real_repertoire`) est exclu de la CI (trop long).

### CD (push sur `main`, ou lancement manuel)

1. Relance la CI via `workflow_call`.
2. Si succès : connexion SSH au VPS.
3. Sur le VPS, `deploy/deploy.sh <sha>` :
   - mémorise le commit actuel ;
   - `git fetch` + `git checkout --detach <sha>` ;
   - `docker compose … build` **pendant que l’ancienne version tourne encore** ;
   - `docker compose … up -d --remove-orphans` (pas de `down`, volumes conservés) ;
   - au démarrage du backend, `entrypoint.py` exécute **migrate**, **sync_roles**, **create_admin** (si besoin), **import_repertoire --si-vide**, puis **collectstatic** ;
   - attend `http://127.0.0.1:8000/api/sante/` ;
   - en cas d’échec : **rollback** automatique (voir ci-dessous).

## Rollback

### Automatique

Si le build, le `up` ou le healthcheck échoue, `deploy/deploy.sh` :

1. `git checkout --detach` vers le SHA précédent ;
2. relance `docker compose … up -d --build`.

### Manuel

```bash
cd /var/www/totanga   # ou VPS_APP_DIR
git fetch origin
# Remplacer par le SHA connu comme stable :
bash ./deploy/deploy.sh <sha-precedent>
```

Ou sans le script :

```bash
git checkout --detach <sha-precedent>
docker compose -f docker-compose.production.yml --env-file .env up -d --build
```

La base PostgreSQL et le volume `media_data` ne sont **pas** effacés par un rollback de code. Un rollback ne défait pas une migration déjà appliquée : pour cela il faudrait une migration inverse planifiée (hors script actuel).

## Commandes utiles sur le VPS

```bash
cd /var/www/totanga

# État
docker compose -f docker-compose.production.yml ps
curl -fsS http://127.0.0.1:8000/api/sante/

# Journaux
docker compose -f docker-compose.production.yml logs -f backend

# Redémarrer sans changer de code
docker compose -f docker-compose.production.yml --env-file .env up -d

# Déployer une révision précise (même logique que la CI)
bash ./deploy/deploy.sh <sha>

# Arrêt sans perdre les données
docker compose -f docker-compose.production.yml stop
```

Ne jamais lancer `docker compose down -v` en production : cela efface les volumes (base et media).

## Checklist avant le premier déploiement automatique

- [ ] Dépôt cloné sur le VPS, remote GitHub OK (`git fetch`).
- [ ] `.env` présent, hors Git, avec domaines HTTPS.
- [ ] Premier `up --build` manuel réussi, `/api/sante/` OK.
- [ ] Nginx hôte route vers 8080 / 8081 / 8000.
- [ ] Secrets GitHub renseignés + environnement `production`.
- [ ] Utilisateur SSH peut exécuter `docker compose` sans mot de passe.
- [ ] `deploy/deploy.sh` exécutable (`chmod +x`).
