#!/usr/bin/env bash
# Mr. Valet Manpower Control — one-time server setup for Ubuntu 24.04 (Contabo VPS).
#
#   curl -fsSLO https://raw.githubusercontent.com/mannskahlon84/Mr.Valet-Outsource-Attendance/main/deploy/setup.sh
#   sudo bash setup.sh
#
# Installs and configures, all on this one server:
#   PostgreSQL 17 (local only) · Python 3.12 backend (FastAPI, 127.0.0.1:8000)
#   Node 22 web app (Next.js, 127.0.0.1:3000) · Nginx + Let's Encrypt HTTPS in front
#   systemd services with auto-restart · UFW firewall · daily database backups
#   helper commands: mrvalet-update, mrvalet-import-render, mrvalet-backup, mrvalet-logs
#
# Safe to run again: it keeps existing secrets, the database and its data.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/mannskahlon84/Mr.Valet-Outsource-Attendance.git}"
APP_USER="mrvalet"
APP_DIR="/opt/mrvalet/app"
ENV_DIR="/etc/mrvalet"
BACKUP_DIR="/var/backups/mrvalet"
DB_NAME="mrvalet"
DB_USER="mrvalet"

log()  { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Run as root: sudo bash setup.sh"
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || fail "This script is written for Ubuntu (found ${ID:-unknown})."

# ---------------------------------------------------------------- questions
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
BRANCH="${BRANCH:-}"
[ -n "$DOMAIN" ] || read -rp "Domain for the app (e.g. app.mrvalet.com): " DOMAIN
[ -n "$EMAIL" ]  || read -rp "Email for HTTPS certificate notices: " EMAIL
[ -n "$BRANCH" ] || { read -rp "Git branch to deploy [main]: " BRANCH; BRANCH="${BRANCH:-main}"; }
[ -n "$DOMAIN" ] || fail "A domain is required (phones only allow camera and GPS on https:// sites)."

# ---------------------------------------------------------------- packages
log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git nginx ufw python3.12 python3.12-venv python3-pip \
    build-essential libpq-dev certbot python3-certbot-nginx

if ! command -v psql >/dev/null || ! psql --version | grep -q " 17"; then
    log "Installing PostgreSQL 17 (official repository)"
    install -d /usr/share/postgresql-common/pgdg
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list
    apt-get update -y
    apt-get install -y postgresql-17 postgresql-client-17
    # Newest client tools too, to copy data from newer hosted databases (Render runs PostgreSQL 18)
    apt-get install -y postgresql-client-18 || true
fi

if ! command -v node >/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]; then
    log "Installing Node.js 22 LTS"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# ---------------------------------------------------------------- user, code
log "Creating the '${APP_USER}' service account"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/mrvalet --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" /opt/mrvalet

log "Fetching code (branch: ${BRANCH})"
if [ -d "$APP_DIR/.git" ]; then
    sudo -u "$APP_USER" git -C "$APP_DIR" fetch --prune origin
else
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi
sudo -u "$APP_USER" git -C "$APP_DIR" checkout "$BRANCH"
sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/$BRANCH"

# ---------------------------------------------------------------- database
log "Configuring PostgreSQL"
systemctl enable --now postgresql
install -d -m 750 "$ENV_DIR"
if [ ! -f "$ENV_DIR/db_password" ]; then
    openssl rand -hex 24 > "$ENV_DIR/db_password"
    chmod 600 "$ENV_DIR/db_password"
fi
DB_PASS="$(cat "$ENV_DIR/db_password")"
sudo -u postgres psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
    || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE ${DB_USER} PASSWORD '${DB_PASS}'" >/dev/null
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
    || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

# ---------------------------------------------------------------- settings
log "Writing settings to ${ENV_DIR}/backend.env"
if [ ! -f "$ENV_DIR/backend.env" ]; then
    cat > "$ENV_DIR/backend.env" <<EOF
# Mr. Valet backend settings. Edit, then: systemctl restart mrvalet-backend
ENVIRONMENT=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
SECRET_KEY=$(openssl rand -base64 48 | tr -d '\n=+/')
FRONTEND_URL=https://${DOMAIN}
AUTO_SEED=false
# The web app and API share one address, so no other site needs browser access
ALLOWED_ORIGINS=

# Email for password-reset links (fill in to enable "Forgot password")
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USERNAME=
# SMTP_PASSWORD=
# SMTP_FROM=Mr. Valet <no-reply@${DOMAIN}>
EOF
fi
cat > "$ENV_DIR/web.env" <<EOF
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
BACKEND_INTERNAL_URL=http://127.0.0.1:8000/api/v1
EOF
chown -R root:"$APP_USER" "$ENV_DIR"
chmod 640 "$ENV_DIR"/*.env

# ---------------------------------------------------------------- build
log "Installing the backend (Python)"
sudo -u "$APP_USER" python3.12 -m venv "$APP_DIR/backend/venv"
sudo -u "$APP_USER" "$APP_DIR/backend/venv/bin/pip" install --quiet --upgrade pip
sudo -u "$APP_USER" "$APP_DIR/backend/venv/bin/pip" install --quiet -r "$APP_DIR/backend/requirements.txt"

log "Building the web app (Node) — this takes a few minutes"
sudo -u "$APP_USER" bash -c "cd '$APP_DIR/web' && npm ci --no-audit --no-fund && npm run build"

# ---------------------------------------------------------------- services
log "Creating systemd services"
cat > /etc/systemd/system/mrvalet-backend.service <<EOF
[Unit]
Description=Mr. Valet backend (FastAPI)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${ENV_DIR}/backend.env
# Bring the database schema up to date before serving
ExecStartPre=${APP_DIR}/backend/venv/bin/python -c "from app.db.migrate import run_migrations; run_migrations()"
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 3 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/mrvalet-web.service <<EOF
[Unit]
Description=Mr. Valet web app (Next.js)
After=network.target mrvalet-backend.service

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/web
EnvironmentFile=${ENV_DIR}/web.env
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mrvalet-backend mrvalet-web
systemctl restart mrvalet-backend
systemctl restart mrvalet-web

# ---------------------------------------------------------------- nginx
log "Configuring Nginx for ${DOMAIN}"
cat > /etc/nginx/sites-available/mrvalet <<EOF
# Mr. Valet: the web app on /, the API on /api/ and /health/ (same address, no CORS needed)
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 20m;      # selfie photos and Excel imports
    server_tokens off;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "camera=(self), geolocation=(self), microphone=()" always;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        # Overwrite (not append) so clients can't fake their address for the login lockout
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location /health/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/mrvalet /etc/nginx/sites-enabled/mrvalet
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

# ---------------------------------------------------------------- firewall
log "Enabling the firewall (SSH, HTTP, HTTPS only)"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

# ---------------------------------------------------------------- helper commands
log "Installing helper commands"
cat > /usr/local/bin/mrvalet-backup <<EOF
#!/usr/bin/env bash
# Daily database backup, kept for 14 days
set -euo pipefail
# Owned by postgres: the dump runs as the postgres user
install -d -m 700 -o postgres -g postgres ${BACKUP_DIR}
sudo -u postgres pg_dump -Fc ${DB_NAME} -f "${BACKUP_DIR}/${DB_NAME}-\$(date +%F-%H%M).dump"
find ${BACKUP_DIR} -name '*.dump' -mtime +14 -delete
echo "Backup written to ${BACKUP_DIR}"
EOF
ln -sf /usr/local/bin/mrvalet-backup /etc/cron.daily/mrvalet-backup

cat > /usr/local/bin/mrvalet-update <<EOF
#!/usr/bin/env bash
# Deploy the latest code:  mrvalet-update            (same branch)
#                          mrvalet-update ui-redesign (switch branch)
set -euo pipefail
BRANCH="\${1:-\$(sudo -u ${APP_USER} git -C ${APP_DIR} rev-parse --abbrev-ref HEAD)}"
/usr/local/bin/mrvalet-backup
sudo -u ${APP_USER} git -C ${APP_DIR} fetch --prune origin
sudo -u ${APP_USER} git -C ${APP_DIR} checkout "\$BRANCH"
sudo -u ${APP_USER} git -C ${APP_DIR} reset --hard "origin/\$BRANCH"
sudo -u ${APP_USER} ${APP_DIR}/backend/venv/bin/pip install --quiet -r ${APP_DIR}/backend/requirements.txt
sudo -u ${APP_USER} bash -c "cd ${APP_DIR}/web && npm ci --no-audit --no-fund && npm run build"
systemctl restart mrvalet-backend
systemctl restart mrvalet-web
echo "Deployed \$BRANCH @ \$(sudo -u ${APP_USER} git -C ${APP_DIR} rev-parse --short HEAD)"
EOF

cat > /usr/local/bin/mrvalet-import-render <<EOF
#!/usr/bin/env bash
# Copy the live data from the Render PostgreSQL database into this server.
#   mrvalet-import-render 'postgresql://USER:PASSWORD@HOST.oregon-postgres.render.com/DBNAME'
# Use Render's "External Database URL". This REPLACES the data on this server (a backup is taken first).
set -euo pipefail
[ \$# -eq 1 ] || { echo "Usage: mrvalet-import-render '<Render External Database URL>'"; exit 1; }
SRC="\$1"
case "\$SRC" in *sslmode=*) ;; *\?*) SRC="\$SRC&sslmode=require" ;; *) SRC="\$SRC?sslmode=require" ;; esac
DUMP=/tmp/render-\$(date +%s).dump
# Use the newest installed PostgreSQL tools: pg_dump refuses to copy from a newer server
# (Render runs PostgreSQL 18), and Ubuntu's default wrapper picks the local server's version.
PGBIN="\$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
echo "Downloading from Render (tools: \$PGBIN)..."
"\$PGBIN/pg_dump" -Fc --no-owner --no-acl "\$SRC" -f "\$DUMP"
/usr/local/bin/mrvalet-backup
systemctl stop mrvalet-web mrvalet-backend
echo "Replacing local data..."
sudo -u postgres dropdb --if-exists ${DB_NAME}
sudo -u postgres createdb -O ${DB_USER} ${DB_NAME}
chmod 644 "\$DUMP"
sudo -u postgres "\$PGBIN/pg_restore" --no-owner --role=${DB_USER} -d ${DB_NAME} "\$DUMP" || echo "(pg_restore reported warnings; checking the result below)"
rm -f "\$DUMP"
systemctl start mrvalet-backend mrvalet-web
sleep 3
sudo -u postgres psql -d ${DB_NAME} -tc "SELECT 'users: '||count(*) FROM users UNION ALL SELECT 'venues: '||count(*) FROM sites UNION ALL SELECT 'requests: '||count(*) FROM manpower_requests"
echo "Import finished."
EOF

cat > /usr/local/bin/mrvalet-logs <<'EOF'
#!/usr/bin/env bash
# Live logs:  mrvalet-logs  (backend + web)   ·  mrvalet-logs backend  ·  mrvalet-logs web
case "${1:-all}" in
  backend) journalctl -u mrvalet-backend -f ;;
  web)     journalctl -u mrvalet-web -f ;;
  *)       journalctl -u mrvalet-backend -u mrvalet-web -f ;;
esac
EOF
chmod 755 /usr/local/bin/mrvalet-*

# ---------------------------------------------------------------- https
log "Requesting the HTTPS certificate"
SERVER_IP="$(curl -4 -fsS https://ifconfig.me || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
if [ -n "$DNS_IP" ] && [ "$DNS_IP" = "$SERVER_IP" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
else
    echo "Skipped: ${DOMAIN} points to '${DNS_IP:-nothing}', this server is ${SERVER_IP}."
    echo "Once the DNS A record points here, run:"
    echo "  certbot --nginx -d ${DOMAIN} -m ${EMAIL} --agree-tos --redirect"
fi

# ---------------------------------------------------------------- check
log "Checking the services"
sleep 5
systemctl is-active --quiet mrvalet-backend && echo "backend: running" || echo "backend: NOT running  -> mrvalet-logs backend"
systemctl is-active --quiet mrvalet-web && echo "web: running" || echo "web: NOT running  -> mrvalet-logs web"
curl -fsS http://127.0.0.1:8000/health/ && echo

cat <<EOF

Done. Mr. Valet is set up for https://${DOMAIN}

  Copy the Render data:    mrvalet-import-render '<Render External Database URL>'
  Deploy new code:         mrvalet-update           (or: mrvalet-update ui-redesign)
  Watch logs:              mrvalet-logs
  Backup now:              mrvalet-backup           (daily automatically, in ${BACKUP_DIR})
  Settings:                ${ENV_DIR}/backend.env   (then: systemctl restart mrvalet-backend)
EOF
