#!/usr/bin/env bash
# Déploiement MANUEL sur le VPS avec Docker Compose production.
# Ne jamais appeler ce script depuis GitHub Actions (pas de CD automatique).
# Usage (sur le VPS) : ./deploy/deploy.sh <sha-ou-ref>
# Prérequis : dépôt déjà cloné, fichier .env présent (jamais dans Git).

set -euo pipefail

TARGET_SHA="${1:-}"
if [[ -z "$TARGET_SHA" ]]; then
  echo "Usage : $0 <commit-sha>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.production.yml --env-file .env)

if [[ ! -f .env ]]; then
  echo "Fichier .env introuvable dans $ROOT. Créez-le sur le VPS à partir de .env.example." >&2
  exit 1
fi

PREVIOUS_SHA="$(git rev-parse HEAD)"
echo "Révision actuelle : $PREVIOUS_SHA"
echo "Cible             : $TARGET_SHA"

rollback() {
  echo "Échec du déploiement. Retour à $PREVIOUS_SHA…" >&2
  git checkout --detach "$PREVIOUS_SHA"
  "${COMPOSE[@]}" up -d --build --remove-orphans || true
  echo "Rollback terminé (révision $PREVIOUS_SHA)." >&2
}

wait_healthy() {
  local tries=40
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "http://127.0.0.1:8000/api/sante/" >/dev/null 2>&1; then
      echo "Backend en bonne santé."
      return 0
    fi
    echo "Attente santé backend ($i/$tries)…"
    sleep 3
  done
  echo "Le backend n'a pas répondu à /api/sante/ à temps." >&2
  return 1
}

trap 'rollback' ERR

echo "Mise à jour du code depuis GitHub…"
git fetch --prune origin
git checkout --detach "$TARGET_SHA"

echo "Construction des images (l'ancien service reste disponible pendant le build)…"
"${COMPOSE[@]}" build

echo "Basculage des conteneurs…"
# Pas de down : les volumes (base, media) restent. Les conteneurs sont recréés.
"${COMPOSE[@]}" up -d --remove-orphans

# migrate + collectstatic sont exécutés par entrypoint.py au démarrage du backend.
wait_healthy

trap - ERR
echo "Déploiement réussi : $TARGET_SHA"
git --no-pager log -1 --oneline
