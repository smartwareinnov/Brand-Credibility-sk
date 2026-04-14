#!/bin/bash
# =============================================================================
# Skorvia — Deploy Script
# Usage: ./deploy.sh
# Run this from /home/skorvia/app on the server after pulling new code.
# =============================================================================

set -e  # Exit immediately on any error

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

log()  { echo -e "${BLUE}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
APP_DIR="/home/skorvia/app"
WEB_ROOT="/var/www/skorvia"
PM2_APP="skorvia-api"
ENV_FILE="$APP_DIR/.env"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
log "Running pre-flight checks..."

[ -f "$ENV_FILE" ] || fail ".env file not found at $ENV_FILE"
[ -d "$APP_DIR" ]  || fail "App directory not found: $APP_DIR"

# Load DATABASE_URL from .env for schema push
export $(grep -v '^#' "$ENV_FILE" | grep 'DATABASE_URL' | xargs)
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL not set in .env"

ok "Pre-flight checks passed"

# ── Step 1: Pull latest code ──────────────────────────────────────────────────
log "Pulling latest code from git..."
cd "$APP_DIR"
git pull origin main
ok "Code updated"

# ── Step 2: Install dependencies ──────────────────────────────────────────────
log "Installing dependencies..."
pnpm install --frozen-lockfile
ok "Dependencies installed"

# ── Step 3: Push database schema ──────────────────────────────────────────────
log "Pushing database schema..."
pnpm --filter @workspace/db run push
ok "Database schema up to date"

# ── Step 4: Build API server ──────────────────────────────────────────────────
log "Building API server..."
cd "$APP_DIR/artifacts/api-server"
pnpm run build
ok "API server built"

# ── Step 5: Build frontend ────────────────────────────────────────────────────
log "Building frontend..."
cd "$APP_DIR/artifacts/brand-ready"
NODE_ENV=production pnpm run build
ok "Frontend built"

# ── Step 6: Deploy frontend to web root ───────────────────────────────────────
log "Deploying frontend to $WEB_ROOT..."
sudo mkdir -p "$WEB_ROOT"
sudo cp -r "$APP_DIR/artifacts/brand-ready/dist/public/." "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"
ok "Frontend deployed to web root"

# ── Step 7: Restart API server ────────────────────────────────────────────────
log "Restarting API server..."
cd "$APP_DIR"
pm2 restart "$PM2_APP"

# Wait a moment then verify it came back up
sleep 3
if pm2 list | grep -q "$PM2_APP.*online"; then
  ok "API server is online"
else
  fail "API server failed to start — run: pm2 logs $PM2_APP"
fi

# ── Step 8: Smoke test ────────────────────────────────────────────────────────
log "Running smoke test..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/app/config)
if [ "$HTTP_STATUS" = "200" ]; then
  ok "API responding (HTTP $HTTP_STATUS)"
else
  warn "API returned HTTP $HTTP_STATUS — check logs: pm2 logs $PM2_APP"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploy complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
