#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 2 || "$2" != "--confirm" ]]; then
  echo "Usage: $0 CHEMIN_SAUVEGARDE --confirm" >&2
  echo "La restauration remplace les données actuelles. Faites d'abord une sauvegarde." >&2
  exit 2
fi
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="$(realpath "$1")"
cd "$project_root"
test -f "$backup_dir/mysql.sql" || { echo "mysql.sql absent" >&2; exit 1; }
test -f "$backup_dir/uploads.tar.gz" || { echo "uploads.tar.gz absent" >&2; exit 1; }
test -f "$backup_dir/ged.tar.gz" || { echo "ged.tar.gz absent" >&2; exit 1; }
(cd "$backup_dir" && sha256sum -c SHA256SUMS)
env_file="${ENV_FILE:-.env}"
test -f "$env_file" || { echo "Fichier d'environnement absent: $env_file" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$env_file"
set +a

docker compose stop backend frontend
docker compose exec -T -e MYSQL_PWD="$MYSQL_PASSWORD" mysql \
  mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" < "$backup_dir/mysql.sql"
docker run --rm -v lca_uploads_data:/data -v "$backup_dir":/backup alpine:3.21 \
  sh -c 'find /data -mindepth 1 -delete && tar -C /data -xzf /backup/uploads.tar.gz'
docker run --rm -v lca_ged_data:/data -v "$backup_dir":/backup alpine:3.21 \
  sh -c 'find /data -mindepth 1 -delete && tar -C /data -xzf /backup/ged.tar.gz'
docker compose up -d backend frontend
echo "Restauration terminée. Vérifiez immédiatement les healthchecks et les logs."
