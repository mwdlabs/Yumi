#!/bin/sh
# Sauvegarde quotidienne de la base Yumi, gardée 14 jours.
# Sur le serveur : /opt/yumi/backup.sh, lancé par cron (voir deploy/README.md).
set -eu
DIR=/var/backups/yumi
mkdir -p "$DIR"
FILE="$DIR/yumi-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose -f /opt/yumi/compose.yml exec -T postgres pg_dump -U yumi --clean --if-exists yumi \
  | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'yumi-*.sql.gz' -mtime +14 -delete
