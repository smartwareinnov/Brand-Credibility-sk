# Skorvia — VPS Deployment Guide

Complete guide to deploying Skorvia on a Linux VPS from scratch.

---

## Table of Contents

1. [Server Requirements](#1-server-requirements)
2. [Architecture Overview](#2-architecture-overview)
3. [Step 1 — Provision & Secure the Server](#step-1--provision--secure-the-server)
4. [Step 2 — Install System Dependencies](#step-2--install-system-dependencies)
5. [Step 3 — Get the Code onto the Server](#step-3--get-the-code-onto-the-server)
6. [Step 4 — Install Node Packages](#step-4--install-node-packages)
7. [Step 5 — Set Up PostgreSQL](#step-5--set-up-postgresql)
8. [Step 6 — Configure Environment Variables](#step-6--configure-environment-variables)
9. [Step 7 — Push the Database Schema](#step-7--push-the-database-schema)
10. [Step 8 — Build the Application](#step-8--build-the-application)
11. [Step 9 — Run with PM2](#step-9--run-with-pm2)
12. [Step 10 — Configure Nginx](#step-10--configure-nginx)
13. [Step 11 — Enable HTTPS with Let's Encrypt](#step-11--enable-https-with-lets-encrypt)
14. [Step 12 — Configure the Admin Panel](#step-12--configure-the-admin-panel)
15. [Environment Variables Reference](#environment-variables-reference)
16. [Security Checklist](#security-checklist)
17. [Database Backups](#database-backups)
18. [Updating the App](#updating-the-app)
19. [Troubleshooting](#troubleshooting)

---

## 1. Server Requirements

### Minimum Recommended Specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 1 vCPU | 2 vCPUs |
| **RAM** | 1 GB | 2 GB |
| **Disk** | 20 GB SSD | 40 GB SSD |
| **Bandwidth** | 1 TB/month | 2 TB/month |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS or 24.04 LTS |

> A $6–$12/month VPS from DigitalOcean, Hetzner, Vultr, or Linode handles moderate traffic comfortably.

### Software Versions

| Software | Version |
|----------|---------|
| **Node.js** | v22 LTS |
| **pnpm** | v9+ |
| **PostgreSQL** | v15 or v16 |
| **Nginx** | 1.18+ |
| **PM2** | Latest |
| **Certbot** | Latest |
| **Git** | 2.x |

---

## 2. Architecture Overview

Skorvia runs as a single Node.js process that serves both the API and the pre-built frontend static files.

```
Internet
    │
    ▼
Nginx (port 80 / 443)
    │
    ├── /api/*  ──────────► Express API Server (localhost:8080)
    │                              │
    │                              ▼
    │                        PostgreSQL (localhost:5432)
    │
    └── /*  ──────────────► Static files
                            (artifacts/brand-ready/dist/public/)
```

**Two services to manage:**

| Service | Location | Port |
|---------|----------|------|
| API Server | `artifacts/api-server/dist/index.mjs` | `8080` |
| Frontend | `artifacts/brand-ready/dist/public/` | Served by Nginx |

---

## Step 1 — Provision & Secure the Server

### 1.1 Connect as root

```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Create a non-root user

```bash
adduser skorvia
usermod -aG sudo skorvia
```

### 1.3 Set up SSH key authentication

```bash
su - skorvia
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your local machine's public key (~/.ssh/id_rsa.pub or ~/.ssh/id_ed25519.pub)
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
exit
```

Verify you can log in with the key before disabling password auth:

```bash
ssh skorvia@YOUR_SERVER_IP
```

### 1.4 Harden SSH (optional but recommended)

```bash
sudo nano /etc/ssh/sshd_config
```

Set these values:

```
PermitRootLogin no
PasswordAuthentication no
```

```bash
sudo systemctl restart sshd
```

### 1.5 Configure the firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## Step 2 — Install System Dependencies

Run as the `skorvia` user:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx certbot python3-certbot-nginx unzip
```

### 2.1 Install Node.js v22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version    # v22.x.x
npm --version     # 10.x.x
```

### 2.2 Install pnpm

```bash
npm install -g pnpm@latest
pnpm --version    # 9.x.x or later
```

### 2.3 Install PM2

```bash
npm install -g pm2
pm2 --version
```

---

## Step 3 — Get the Code onto the Server

### Option A — Git Clone (recommended)

```bash
cd /home/skorvia
git clone https://github.com/YOUR_USERNAME/skorvia.git app
cd app
```

### Option B — Upload a ZIP

On your local machine:

```bash
# Create a zip (exclude node_modules and dist folders)
zip -r skorvia.zip . \
  --exclude "*/node_modules/*" \
  --exclude "*/dist/*" \
  --exclude "*/.git/*"

scp skorvia.zip skorvia@YOUR_SERVER_IP:/home/skorvia/
```

On the server:

```bash
cd /home/skorvia
unzip skorvia.zip -d app
cd app
```

---

## Step 4 — Install Node Packages

From the project root (where `pnpm-workspace.yaml` lives):

```bash
cd /home/skorvia/app
pnpm install --frozen-lockfile
```

This installs dependencies for all workspace packages:
- `artifacts/api-server`
- `artifacts/brand-ready`
- `lib/db`
- `lib/api-zod`
- `lib/api-client-react`

> **Note:** The `pnpm-workspace.yaml` has `minimumReleaseAge: 1440` — this is a supply-chain security setting. Do not remove it.

---

## Step 5 — Set Up PostgreSQL

### 5.1 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql   # Should show "active (running)"
```

### 5.2 Create the database and user

```bash
sudo -u postgres psql
```

Inside the `psql` prompt:

```sql
CREATE USER skorvia_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE skorvia_db OWNER skorvia_user;
GRANT ALL PRIVILEGES ON DATABASE skorvia_db TO skorvia_user;
\q
```

### 5.3 Test the connection

```bash
psql postgresql://skorvia_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/skorvia_db
# Should connect successfully — type \q to exit
```

Your `DATABASE_URL` will be:

```
postgresql://skorvia_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/skorvia_db
```

---

## Step 6 — Configure Environment Variables

Create the `.env` file at the project root:

```bash
nano /home/skorvia/app/.env
```

Fill in every value:

```bash
# ─── Core ──────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=8080

# Your public domain — used in email confirmation links and OAuth callbacks
APP_URL=https://yourdomain.com

# ─── Database ──────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://skorvia_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/skorvia_db

# ─── Admin Panel ───────────────────────────────────────────────────────────
# IMPORTANT: Change these from the defaults before going live!
ADMIN_USERNAME=admin
ADMIN_PASSWORD=REPLACE_WITH_VERY_STRONG_ADMIN_PASSWORD

# ─── Email — Resend (REQUIRED for email confirmation) ──────────────────────
# Sign up at https://resend.com, verify your domain, then create an API key.
# Without this, users cannot confirm their email and cannot register.
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=Skorvia <noreply@yourdomain.com>

# ─── Google OAuth (optional) ───────────────────────────────────────────────
# Create OAuth 2.0 credentials at https://console.cloud.google.com
# Authorized redirect URI: https://yourdomain.com/api/auth/google/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── Flutterwave Payments (required for paid plans) ────────────────────────
# Get your secret key from https://dashboard.flutterwave.com
FLUTTERWAVE_SECRET_KEY=

# ─── OpenAI (required for all AI features) ─────────────────────────────────
# Get your key from https://platform.openai.com/api-keys
# Can also be set from Admin Panel → API Integrations after deployment
OPENAI_API_KEY=

# ─── Logging ───────────────────────────────────────────────────────────────
LOG_LEVEL=info
```

Protect the file:

```bash
chmod 600 /home/skorvia/app/.env
```

---

## Step 7 — Push the Database Schema

This creates all required tables in your PostgreSQL database.

```bash
cd /home/skorvia/app

# Export the DATABASE_URL so drizzle-kit can find it
export DATABASE_URL="postgresql://skorvia_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/skorvia_db"

# Push the schema
pnpm --filter @workspace/db run push
```

You should see output ending with something like:

```
[✓] Changes applied
```

> **Important:** Run this again after every deployment that includes database schema changes.

---

## Step 8 — Build the Application

### 8.1 Build the API Server

```bash
cd /home/skorvia/app/artifacts/api-server
pnpm run build
```

This compiles TypeScript → `artifacts/api-server/dist/index.mjs`.

Verify the build succeeded:

```bash
ls -la dist/
# Should contain: index.mjs, index.mjs.map, pino-worker.mjs, etc.
```

### 8.2 Build the Frontend

```bash
cd /home/skorvia/app/artifacts/brand-ready
NODE_ENV=production pnpm run build
```

This produces static files in `artifacts/brand-ready/dist/public/`.

Verify:

```bash
ls dist/public/
# Should contain: index.html, assets/
```

---

## Step 9 — Run with PM2

PM2 keeps the API server running and restarts it on crash or server reboot.

### 9.1 Create the PM2 ecosystem file

```bash
nano /home/skorvia/app/ecosystem.config.cjs
```

```js
module.exports = {
  apps: [
    {
      name: "skorvia-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/home/skorvia/app",
      env_file: "/home/skorvia/app/.env",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "/home/skorvia/logs/api-error.log",
      out_file: "/home/skorvia/logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
```

Create the logs directory:

```bash
mkdir -p /home/skorvia/logs
```

### 9.2 Start the API server

```bash
cd /home/skorvia/app
pm2 start ecosystem.config.cjs
```

### 9.3 Enable startup on server reboot

```bash
pm2 save
pm2 startup
# PM2 will print a command — copy and run it, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u skorvia --hp /home/skorvia
```

### 9.4 Verify it is running

```bash
pm2 list
# Should show skorvia-api with status "online"

pm2 logs skorvia-api --lines 20
# Should show "Server listening" with no errors

curl http://localhost:8080/api/app/config
# Should return JSON: {"siteName":"Skorvia","allowSignups":true,...}
```

---

## Step 10 — Configure Nginx

Nginx serves the static frontend and proxies `/api/*` to the Express server.

### 10.1 Create the Nginx config

```bash
sudo nano /etc/nginx/sites-available/skorvia
```

Paste the following — replace `yourdomain.com` with your actual domain:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    # Frontend static files
    root /home/skorvia/app/artifacts/brand-ready/dist/public;
    index index.html;

    # API — proxy to Express server
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        client_max_body_size 20M;
    }

    # SPA fallback — all non-file routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively (Vite adds content hashes to filenames)
    location ~* \.(js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Never cache index.html (so new deployments take effect immediately)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }
}
```

### 10.2 Enable the site

```bash
# Remove the default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable Skorvia
sudo ln -s /etc/nginx/sites-available/skorvia /etc/nginx/sites-enabled/

# Test the config
sudo nginx -t
# Should output: syntax is ok / test is successful

# Reload Nginx
sudo systemctl reload nginx
```

### 10.3 Point your domain to the server

In your domain registrar's DNS settings, add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `YOUR_SERVER_IP` | 300 |
| A | `www` | `YOUR_SERVER_IP` | 300 |

DNS propagation takes 5–30 minutes. Test with:

```bash
dig yourdomain.com +short
# Should return YOUR_SERVER_IP
```

---

## Step 11 — Enable HTTPS with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will:
- Obtain a free SSL certificate from Let's Encrypt
- Automatically update your Nginx config to redirect HTTP → HTTPS
- Set up auto-renewal (certificates expire every 90 days)

Test auto-renewal:

```bash
sudo certbot renew --dry-run
# Should complete without errors
```

Verify HTTPS is working:

```bash
curl -I https://yourdomain.com/api/app/config
# Should return HTTP/2 200
```

---

## Step 12 — Configure the Admin Panel

After deployment, log in to the admin panel to finish configuration.

### 12.1 Access the admin panel

Navigate to: `https://yourdomain.com/admin/login`

Default credentials (change immediately):
- **Username:** `admin` (or whatever you set in `ADMIN_USERNAME`)
- **Password:** The value you set in `ADMIN_PASSWORD`

### 12.2 Required configuration

Go to **Admin → API Integrations** and configure:

| Setting | Why it's needed |
|---------|----------------|
| **Resend API Key** | Email confirmations, password resets, subscription reminders |
| **Resend From Email** | The sender address for all emails |
| **Flutterwave Secret Key** | Payment processing for paid plans |
| **Flutterwave Public Key** | Frontend payment initiation |
| **OpenAI API Key** | All AI features (Brand Coach, Content Generator, etc.) |

### 12.3 Set up subscription plans

Go to **Admin → Plans & Pricing** and click **Seed Default Plans** to create the Free, Starter, and Growth plans.

> Without plans seeded, users will see an empty pricing page and cannot subscribe.

### 12.4 Configure appearance (optional)

Go to **Admin → Appearance** to:
- Upload your logo
- Set brand colors
- Update the site name and tagline

### 12.5 Change the admin password

Go to **Admin → Security** and enable 2FA, or change your password via the API:

```bash
curl -X POST https://yourdomain.com/api/admin/change-password \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_CURRENT_TOKEN" \
  -d '{"currentPassword":"old","newPassword":"new-strong-password"}'
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | Must be `production` |
| `PORT` | ✅ | API server port — use `8080` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `APP_URL` | ✅ | Full public URL e.g. `https://yourdomain.com` — used in email links |
| `ADMIN_USERNAME` | ✅ | Admin panel login username |
| `ADMIN_PASSWORD` | ✅ | Admin panel login password — **change from default** |
| `RESEND_API_KEY` | ✅ | Transactional email — users cannot register without this |
| `RESEND_FROM` | ✅ | Sender address e.g. `Skorvia <noreply@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth sign-in |
| `FLUTTERWAVE_SECRET_KEY` | Optional | Payment processing — can also be set from Admin Panel |
| `OPENAI_API_KEY` | Optional | AI features — can also be set from Admin Panel |
| `LOG_LEVEL` | Optional | `fatal` / `error` / `warn` / `info` / `debug` (default: `info`) |

> **Note:** All API keys (OpenAI, Flutterwave, SERP, etc.) can also be configured from **Admin → API Integrations** after deployment. Environment variables are only needed for initial bootstrap or if you prefer not to store keys in the database.

---

## Security Checklist

Before going live:

- [ ] **Changed the default admin password** — `ADMIN_PASSWORD` env var is not the default
- [ ] **HTTPS is active** — Certbot certificate installed, HTTP redirects to HTTPS
- [ ] **Firewall only allows 22, 80, 443** — `sudo ufw status`
- [ ] **`.env` is protected** — `ls -la /home/skorvia/app/.env` shows `-rw-------`
- [ ] **Database is not internet-accessible** — `sudo ss -tlnp | grep 5432` shows `127.0.0.1:5432` only
- [ ] **PM2 startup is configured** — `pm2 list` shows `skorvia-api` as `online`
- [ ] **Root SSH login is disabled** — `PermitRootLogin no` in `/etc/ssh/sshd_config`
- [ ] **Resend domain is verified** — email confirmation works end-to-end
- [ ] **Plans are seeded** — Admin → Plans & Pricing shows at least Free, Starter, Growth
- [ ] **Google OAuth redirect URI** set to `https://yourdomain.com/api/auth/google/callback` (if using Google sign-in)

---

## Database Backups

Set up automatic daily backups:

```bash
mkdir -p /home/skorvia/backups
nano /home/skorvia/backup.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/skorvia/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_URL="postgresql://skorvia_user:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/skorvia_db"

mkdir -p "$BACKUP_DIR"

pg_dump "$DB_URL" | gzip > "$BACKUP_DIR/skorvia_$DATE.sql.gz"

# Keep only the last 14 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete

echo "[$(date)] Backup completed: skorvia_$DATE.sql.gz"
```

```bash
chmod +x /home/skorvia/backup.sh

# Test it
/home/skorvia/backup.sh
ls /home/skorvia/backups/

# Schedule daily at 2:00 AM
crontab -e
```

Add this line:

```
0 2 * * * /home/skorvia/backup.sh >> /home/skorvia/logs/backup.log 2>&1
```

### Restore from backup

```bash
gunzip -c /home/skorvia/backups/skorvia_YYYYMMDD_HHMMSS.sql.gz | \
  psql postgresql://skorvia_user:PASSWORD@localhost:5432/skorvia_db
```

---

## Updating the App

When you push new code:

```bash
cd /home/skorvia/app

# 1. Pull latest code
git pull origin main

# 2. Install any new packages
pnpm install --frozen-lockfile

# 3. Apply any new database schema changes
export DATABASE_URL="postgresql://skorvia_user:PASSWORD@localhost:5432/skorvia_db"
pnpm --filter @workspace/db run push

# 4. Rebuild the API server
cd artifacts/api-server
pnpm run build
cd ../..

# 5. Rebuild the frontend
cd artifacts/brand-ready
NODE_ENV=production pnpm run build
cd ../..

# 6. Restart the API server
pm2 restart skorvia-api

# 7. Verify it came back up
pm2 list
curl http://localhost:8080/api/app/config
```

> The frontend is static — Nginx serves the new files immediately after the build. No Nginx restart needed.

---

## Troubleshooting

### API server won't start

```bash
pm2 logs skorvia-api --lines 50
```

Common causes:

| Symptom | Fix |
|---------|-----|
| `Error: connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running — `sudo systemctl start postgresql` |
| `Error: DATABASE_URL is not set` | `.env` file not found or not loaded — check `env_file` in `ecosystem.config.cjs` |
| `Error: Port 8080 already in use` | Another process on 8080 — `sudo lsof -i :8080` then kill it |
| `SyntaxError` or `Cannot find module` | Build failed — re-run `pnpm run build` in `artifacts/api-server` |

### Nginx returns 502 Bad Gateway

The API server is not running or not reachable:

```bash
pm2 list                                    # Check if skorvia-api is online
curl http://localhost:8080/api/app/config   # Test API directly
pm2 restart skorvia-api                  # Restart if needed
```

### Nginx returns 404 for all routes

The frontend build is missing or the Nginx `root` path is wrong:

```bash
ls /home/skorvia/app/artifacts/brand-ready/dist/public/
# Must contain index.html

# Check Nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/skorvia | grep root
```

### Email confirmation not working

1. Verify `RESEND_API_KEY` is set in `.env`
2. Verify your sending domain is verified in the Resend dashboard
3. Check the API logs: `pm2 logs skorvia-api | grep -i resend`
4. Test by triggering a signup and checking `pm2 logs skorvia-api`

### Users can't log in after deployment

Check that the database schema was pushed:

```bash
export DATABASE_URL="postgresql://skorvia_user:PASSWORD@localhost:5432/skorvia_db"
pnpm --filter @workspace/db run push
pm2 restart skorvia-api
```

### Pricing page shows no plans

Log in to the admin panel and go to **Plans & Pricing → Seed Default Plans**.

### HTTPS certificate expired

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Check all logs at once

```bash
# API server logs
pm2 logs skorvia-api

# Nginx access log
sudo tail -f /var/log/nginx/access.log

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL log
sudo tail -f /var/log/postgresql/postgresql-*.log
```

---

*Skorvia — Node.js v22, pnpm monorepo, PostgreSQL, Nginx, PM2.*
