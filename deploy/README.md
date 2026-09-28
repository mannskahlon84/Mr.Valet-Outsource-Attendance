# Deploying Mr. Valet to the Contabo VPS

Everything runs on one Ubuntu 24.04 server:

```
Internet ──https──> Nginx ──/api/, /health/──> Backend (FastAPI, 127.0.0.1:8000) ──> PostgreSQL 17 (local)
                          └──everything else──> Web app (Next.js, 127.0.0.1:3000)
```

Backend and web run as systemd services under a dedicated `mrvalet` user and restart on failure or reboot.
Only SSH, HTTP and HTTPS are open in the firewall. The database is backed up daily to `/var/backups/mrvalet`.

## 1. Point the domain at the server

At your DNS provider, create an **A record** for the app's domain (e.g. `app.mrvalet.com`) pointing to
`207.180.209.178`. HTTPS is required: phones only allow the camera (selfie, QR scan) and GPS on `https://` sites.

## 2. Run the setup (on the server, as root)

```bash
curl -fsSLO https://raw.githubusercontent.com/mannskahlon84/Mr.Valet-Outsource-Attendance/ui-redesign/deploy/setup.sh
sudo bash setup.sh
```

It asks for the domain, an email for certificate notices, and the branch (`main` or `ui-redesign`).
It takes about 10 minutes, mostly the web build. Running it again is safe: secrets and data are kept.

## 3. Copy the data from Render

In the Render dashboard open the PostgreSQL database → **Connect** → copy the **External Database URL**, then:

```bash
mrvalet-import-render 'postgresql://USER:PASSWORD@HOST.render.com/DBNAME'
```

This replaces the (empty) data on the new server; a backup is taken first.

## Everyday commands

| Task | Command |
|---|---|
| Deploy the latest code | `mrvalet-update` |
| Switch branch and deploy | `mrvalet-update ui-redesign` |
| Watch logs | `mrvalet-logs` (or `mrvalet-logs backend` / `mrvalet-logs web`) |
| Backup now | `mrvalet-backup` |
| Service status | `systemctl status mrvalet-backend mrvalet-web` |
| Change settings (email, etc.) | edit `/etc/mrvalet/backend.env`, then `systemctl restart mrvalet-backend` |

## After going live

- Replace the demo passwords: `cd /opt/mrvalet/app/backend && sudo -u mrvalet env $(cat /etc/mrvalet/backend.env | grep -v '^#' | xargs) venv/bin/python -m scripts.rotate_default_passwords /root/new_passwords.csv`
- Fill in the `SMTP_*` settings so "Forgot password" emails work.
- Restore a backup if ever needed: `sudo -u postgres pg_restore --clean --no-owner --role=mrvalet -d mrvalet /var/backups/mrvalet/<file>.dump`
