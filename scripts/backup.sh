#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
env_file="${ENV_FILE:-.env}"
test -f "$env_file" || { echo "Fichier d'environnement absent: $env_file" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$env_file"
set +a

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${1:-$project_root/backups/$stamp}"
mkdir -p "$destination"
chmod 700 "$destination"

docker compose exec -T -e MYSQL_PWD="$MYSQL_PASSWORD" mysql \
  mysqldump -u"$MYSQL_USER" --single-transaction --routines --triggers --events --no-tablespaces \
  --set-gtid-purged=OFF "$MYSQL_DATABASE" > "$destination/mysql.sql"
docker run --rm -v lca_uploads_data:/data:ro -v "$destination":/backup alpine:3.21 \
  tar -C /data -czf /backup/uploads.tar.gz .
docker run --rm -v lca_ged_data:/data:ro -v "$destination":/backup alpine:3.21 \
  tar -C /data -czf /backup/ged.tar.gz .
sha256sum "$destination"/* > "$destination/SHA256SUMS"
echo "Sauvegarde créée dans $destination"
