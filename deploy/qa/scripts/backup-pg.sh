#!/usr/bin/env bash
# Daily Postgres backup for the SDAC QA stack on berrysmart.
# Run via cron: `0 4 * * * /home/<user>/berrysmart/config/sdac-qa/scripts/backup-pg.sh`
#
# Writes a gzipped pg_dump to ./backups/sdac-qa-<UTC-timestamp>.sql.gz next to
# the compose file. Keeps the last 14 days. Fails loudly (exit 1) if the dump
# is smaller than 1 KB — that almost always means the dump didn't actually
# happen (postgres down, auth wrong, etc.) and we want cron to email the error.
set -euo pipefail

STACK_DIR="$HOME/berrysmart/config/sdac-qa"
BACKUP_DIR="$STACK_DIR/backups"
mkdir -p "$BACKUP_DIR"

# Load .env so we know the POSTGRES_USER / POSTGRES_DB to pass to pg_dump.
# shellcheck disable=SC1091
set -a; . "$STACK_DIR/.env"; set +a

TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
OUT="$BACKUP_DIR/sdac-qa-$TS.sql.gz"

docker compose -f "$STACK_DIR/docker-compose.yml" \
    exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 > "$OUT"

# Retention: drop anything older than 14 days.
find "$BACKUP_DIR" -name 'sdac-qa-*.sql.gz' -mtime +14 -delete

# Size sanity: < 1 KB means the dump probably failed silently inside the pipe.
SIZE=$(stat -c %s "$OUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "Backup suspiciously small ($SIZE bytes): $OUT" >&2
  exit 1
fi
