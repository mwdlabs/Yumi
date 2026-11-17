#!/bin/sh
# Déploie l'API sur le Droplet, depuis le Mac.
#
#   pnpm deploy:api [utilisateur@serveur]     (par défaut : mwdadmin@143.198.46.81)
#
# 1. construit l'image linux/amd64 en local (le Droplet n'a pas la mémoire pour compiler) ;
# 2. l'envoie au serveur par SSH (docker save | docker load) ;
# 3. met à jour /opt/yumi (compose.yml, backup.sh) et redémarre l'API ;
# 4. attend que l'API soit en bonne santé (migrations appliquées).
#
# Retour arrière : sur le serveur, remettre l'ancienne YUMI_VERSION dans /opt/yumi/.env,
# puis `docker compose up -d api` (les images précédentes sont conservées).
set -eu

HOST="${1:-mwdadmin@143.198.46.81}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/package.json').version")"
TAG="$VERSION-$(git -C "$ROOT" rev-parse --short HEAD)"
IMAGE="yumi-api:$TAG"

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "✖ Des changements ne sont pas commités : l'image ne correspondrait à aucun commit." >&2
  exit 1
fi

echo "▸ Construction de $IMAGE (linux/amd64)…"
docker buildx build --platform linux/amd64 -f "$ROOT/apps/api/Dockerfile" -t "$IMAGE" --load "$ROOT"

echo "▸ Envoi de l'image au serveur…"
docker save "$IMAGE" | gzip | ssh "$HOST" 'gunzip | docker load'

echo "▸ Mise à jour de /opt/yumi…"
scp "$ROOT/deploy/compose.yml" "$ROOT/deploy/backup.sh" "$HOST:/opt/yumi/"
ssh "$HOST" "set -e
  cd /opt/yumi
  sed -i 's/^YUMI_VERSION=.*/YUMI_VERSION=$TAG/' .env
  docker compose up -d
  for i in \$(seq 1 30); do
    status=\$(docker inspect -f '{{.State.Health.Status}}' yumi-api-1 2>/dev/null || true)
    [ \"\$status\" = healthy ] && echo '✔ API en ligne ($TAG)' && exit 0
    sleep 2
  done
  echo '✖ API pas prête après 60 s :' >&2
  docker compose logs --tail 40 api >&2
  exit 1"
