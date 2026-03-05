#!/usr/bin/env bash
# Start the full SDA Management dev environment:
#   1. PostgreSQL (Docker)
#   2. .NET Backend API (port 5000)
#   3. Vite Frontend (port 5173)
#
# Usage: bash dev.sh
# Stop:  Ctrl+C (kills backend + frontend; Postgres keeps running)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/src/SdaManagement.Api"
WEB_DIR="$SCRIPT_DIR/src/sdamanagement-web"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== SDA Management Dev Environment ===${NC}"

# 1. Ensure PostgreSQL is running
echo -e "${GREEN}[1/3] Starting PostgreSQL...${NC}"
docker compose -f "$SCRIPT_DIR/docker-compose.dev.yml" up -d

# 2. Apply EF Core migrations
echo -e "${GREEN}[2/3] Applying database migrations...${NC}"
dotnet ef database update -p "$API_DIR" --no-build 2>/dev/null || \
  dotnet ef database update -p "$API_DIR"

# 3. Start backend and frontend in parallel
echo -e "${GREEN}[3/3] Starting API (port 5000) + Frontend (port 5173)...${NC}"
echo ""

cleanup() {
  echo ""
  echo -e "${CYAN}Shutting down...${NC}"
  kill $API_PID $WEB_PID 2>/dev/null
  wait $API_PID $WEB_PID 2>/dev/null
  echo -e "${GREEN}Done. PostgreSQL is still running (docker compose -f docker-compose.dev.yml down to stop).${NC}"
}
trap cleanup EXIT INT TERM

cd "$API_DIR" && dotnet run &
API_PID=$!

cd "$WEB_DIR" && npm run dev &
WEB_PID=$!

wait
