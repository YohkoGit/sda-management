#!/usr/bin/env bash
# Pulls the latest `:qa` image tag and restarts the api container if the
# digest changed. Run via cron every 5 minutes:
#   `*/5 * * * * /home/<user>/berrysmart/config/sdac-qa/scripts/refresh.sh >> ...refresh.log 2>&1`
#
# We pin to the moving `:qa` tag rather than `latest`. CI advances this tag
# only after a successful build, so a refresh here only runs known-good code.
# This is intentionally narrower than Watchtower (which would chase `latest`
# on every image in the stack).
set -euo pipefail

STACK_DIR="$HOME/berrysmart/config/sdac-qa"
cd "$STACK_DIR"

# `docker compose pull` is idempotent — it only downloads layers if the remote
# digest differs from the cached one.
docker compose pull api

# `docker compose up -d api` is also idempotent — no-op if the running
# container's image digest matches the pulled one. Otherwise it recreates the
# container with the new image.
docker compose up -d api
