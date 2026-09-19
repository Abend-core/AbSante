#!/usr/bin/env bash
# SECOURS : déploie AbSante sur le Raspberry Pi sans passer par GHCR / Watchtower (le déploiement
# normal est automatique : .github/workflows/deploy-images.yml), et SANS JAMAIS construire sur le Pi.
#
# Le watchdog du Pi (/usr/local/bin/watchdog-check.sh) le redémarre quand la charge (1 min)
# dépasse 10 : un `npm ci` ou un build y suffit. Les images sont donc construites ici
# (plateforme linux/arm64, sans émulation : voir les Dockerfiles), envoyées par SSH avec
# `docker load`, puis démarrées sur le Pi sans construction ni téléchargement.
#
# Usage : scripts/deploy_pi.sh [hôte-ssh]      (défaut : rp-meliodas)
# Prérequis sur le Pi : dépôt cloné dans ~/absante (branche main) et .env rempli.
set -euo pipefail

HOST="${1:-rp-meliodas}"
MAX_LOAD=5          # on ne déploie pas si le Pi est déjà chargé
cd "$(dirname "$0")/.."

load="$(ssh "$HOST" "cut -d' ' -f1 /proc/loadavg" | cut -d. -f1)"
if [ "$load" -gt "$MAX_LOAD" ]; then
  echo "Charge du Pi trop élevée ($load > $MAX_LOAD) : déploiement annulé, réessayez plus tard." >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Construction des images arm64 (sur cette machine)"
docker buildx build --platform linux/arm64 -t ghcr.io/abend-core/absante-api:latest --output "type=docker,dest=$TMP/api.tar" ./api
docker buildx build --platform linux/arm64 -f front/Dockerfile.prod -t ghcr.io/abend-core/absante-front:latest \
  --output "type=docker,dest=$TMP/front.tar" ./front

for image in api front; do
  echo "→ Envoi de l'image $image"
  ssh "$HOST" "nice -n 10 docker load" < "$TMP/$image.tar"
done

echo "→ Redémarrage des conteneurs modifiés"
ssh "$HOST" "cd ~/absante && git pull --ff-only && nice -n 10 docker compose -f docker-compose.prod.yml up -d --no-build"
echo "OK : https://absante.rxdy.fr"
