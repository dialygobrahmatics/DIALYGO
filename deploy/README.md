# Dialygo deployment on Ubuntu 24.04 LTS

This setup targets one 4 vCPU / 8 GB server. Nginx serves the React build and proxies `/api/` to FastAPI on loopback. PostgreSQL and MongoDB remain local and must not be exposed publicly. SSH remains VPN-only. No server IP, domain, or real credentials are included.

## Configuration and repository findings

- The backend requires exactly `DATABASE_URL`, read from `backend/core/config.py`. Use an async PostgreSQL SQLAlchemy URL such as `postgresql+asyncpg://USER:URL_ENCODED_PASSWORD@127.0.0.1:5432/DBNAME`. PostgreSQL is required by the backend/migrations. The old SQLite example was stale; `backend/.env.example` now documents PostgreSQL only.
- `CORS_ORIGINS` is read by `backend/server.py` and split with `.split(',')`: exact origins, comma-separated, no spaces, scheme and optional port included, and no URL paths. An empty value works for same-origin use.
- Frontend build is `npm ci && npm run build` in `frontend/`, output `frontend/build/`. `frontend/src/api/http.ts` uses `REACT_APP_API_BASE_URL` when it is defined; an explicitly empty string therefore beats `REACT_APP_BACKEND_URL` and creates same-origin `/api`. If unset, the legacy variable is used, then the local default `http://localhost:8000`.
- Backend entry point is `backend/server.py`, ASGI object `server:app`. Python 3.10+ is supported; Ubuntu 24.04 Python 3.12 is appropriate. Dependencies are pinned in `backend/requirements.txt`.
- PostgreSQL is the relational store (SQLAlchemy/asyncpg); MongoDB via Motor stores document/OCR records. Uploaded bytes are stored on disk. OCR uses PyMuPDF, Pillow, Python `pytesseract`, and native Tesseract/language data. Tesseract may use temporary files; systemd supplies private writable `/tmp`.
- App startup attempts Alembic migration but catches/logs errors. The migration systemd unit runs Alembic explicitly and must succeed before the API service can start. `GET /api/health` is implemented in `backend/server.py`.
- `start-backend.sh` is a Windows/macOS local launcher, creates local settings, and starts with `--reload`; do not use it on Linux. No other platform-specific backend filesystem path was found. Node is not pinned; choose and record a supported LTS version.

## OTP blocker

Real OTP delivery does **not** work yet. With `OTP_DEBUG=false`, `RandomOtpProvider.send()` only logs a generic message; it does not contact an SMS provider, and the API does not return the generated code. Debug mode uses a fixed development mock OTP. The deployment template disables debug mode and omits fixed OTP codes, so mobile OTP login needs an SMS provider integration before production use. Do not turn debug mode on as a workaround. Some frontend screens also contain mock/demo behavior and data.

## Choices to confirm

The repository does not specify MongoDB release/package source, database names, SMS provider, retention policy, Node LTS, domain, or public access policy. Select these before provisioning. The supplied systemd units expect MongoDB's service name to be `mongod.service`; adjust them if the selected package uses another name.

## Initial setup

Commands below run on the server as the SSH login account with `sudo`. Stage and build files in the login user's home. Deployed application files and venv are root-owned/read-only to the runtime user; Nginx can read the frontend build. Only uploads are writable by `dialygo`.

1. Install the chosen supported Node LTS, Python 3.12/venv, Nginx, PostgreSQL, MongoDB, Tesseract/language data, `rsync`, and any Python build tools needed. This repository does not prescribe package installation commands.
2. Create a non-login runtime account and directories:

   ```sh
   sudo useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin dialygo
   sudo install -d -o root -g root -m 0755 /opt/dialygo /opt/dialygo/app /opt/dialygo/venv
   sudo install -d -o dialygo -g dialygo -m 0750 /var/lib/dialygo/uploads
   sudo install -d -o root -g dialygo -m 0750 /etc/dialygo
   ```

   If account/directories already exist, inspect and fix ownership instead of repeating `useradd`.
3. Configure PostgreSQL and MongoDB to listen on loopback only. Create dedicated application databases/users; keep package-managed database directories persistent and database ports private. URL-encode special characters in the PostgreSQL URL password.
4. As the SSH login user, stage a clean checkout/upload at `$HOME/dialygo-stage`, excluding actual `.env` files, virtualenvs, `node_modules`, build output, test reports, and patient data. Install and edit the production environment file:

   ```sh
   sudo install -o root -g dialygo -m 0640 "$HOME/dialygo-stage/deploy/dialygo.env.example" /etc/dialygo/dialygo.env
   sudoedit /etc/dialygo/dialygo.env
   ```

   Replace all placeholders. Set `CORS_ORIGINS` to the exact confirmed browser origin, or empty for same-origin only. Keep `OTP_DEBUG=false`. Generate two independent secrets and set the confirmed database names/credentials. systemd parses `EnvironmentFile` itself; do not source it as a shell script.
5. Build as the SSH login user, then copy code and build output into the root-owned deployment directory:

   ```sh
   cd "$HOME/dialygo-stage/frontend"
   npm ci
   REACT_APP_API_BASE_URL='' npm run build

   sudo rsync -a --delete \
     --exclude='/.git/' --exclude='**/.env*' \
     --exclude='**/.venv/' --exclude='**/node_modules/' \
     --exclude='/frontend/build/' --exclude='/backend/storage/' \
     "$HOME/dialygo-stage/" /opt/dialygo/app/
   sudo install -d -o root -g root -m 0755 /opt/dialygo/app/frontend/build
   sudo rsync -a --delete "$HOME/dialygo-stage/frontend/build/" /opt/dialygo/app/frontend/build/
   sudo chown -R root:root /opt/dialygo/app
   sudo chmod -R a+rX,go-w /opt/dialygo/app
   ```

   `--delete` is scoped to `/opt/dialygo/app`, which must contain application files only. Uploads, environment and DB data are outside that tree. The staged checkout must not contain patient data. Nginx can traverse the `0755` directories and read build files.
6. Install Python dependencies as root, leaving the venv read-only to `dialygo`:

   ```sh
   sudo python3.12 -m venv /opt/dialygo/venv
   sudo /opt/dialygo/venv/bin/python -m pip install --upgrade pip
   sudo /opt/dialygo/venv/bin/python -m pip install -r /opt/dialygo/app/backend/requirements.txt
   sudo chown -R root:root /opt/dialygo/venv
   sudo chmod -R a+rX,go-w /opt/dialygo/venv
   ```

7. Install service/site configuration and validate Nginx. Resolve any existing default-site conflict deliberately:

   ```sh
   sudo install -o root -g root -m 0644 /opt/dialygo/app/deploy/systemd/dialygo.service /etc/systemd/system/dialygo.service
   sudo install -o root -g root -m 0644 /opt/dialygo/app/deploy/systemd/dialygo-migrate.service /etc/systemd/system/dialygo-migrate.service
   sudo install -o root -g root -m 0644 /opt/dialygo/app/deploy/nginx/dialygo.conf /etc/nginx/sites-available/dialygo
   sudo ln -s /etc/nginx/sites-available/dialygo /etc/nginx/sites-enabled/dialygo
   sudo systemctl daemon-reload
   sudo nginx -t
   ```

8. Run migrations before serving requests:

   ```sh
   sudo systemctl start dialygo-migrate.service
   sudo systemctl enable --now dialygo.service
   sudo systemctl reload nginx
   curl -fsS http://127.0.0.1:8000/api/health
   ```

   The migration unit is `Type=oneshot` and waits for Alembic to finish. `systemctl start` returns failure on migration failure. The API unit has `Requires` and `After` on migration, so it cannot start first. On update, after backup/copy/dependency install, run `sudo systemctl restart dialygo-migrate.service` before `sudo systemctl restart dialygo.service`. Investigate a failed migration rather than starting the API.

## Runtime writes, logs, backups, and rollback

The API's file writes are uploaded reports beneath `STORAGE_DIR=/var/lib/dialygo/uploads`; keep that directory owned by `dialygo`. PostgreSQL and MongoDB write under their own package-managed data paths as separate services. Python bytecode is disabled. OCR temporary files use the service's private `/tmp`; app logs go to journald. `ProtectSystem=strict` makes other host paths read-only to the API. Do not grant write access to code, venv, `/etc/dialygo`, or database directories.

- Backend logs: `sudo journalctl -u dialygo -f`; migration logs: `sudo journalctl -u dialygo-migrate.service`.
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`.
- Check services: `sudo systemctl status dialygo dialygo-migrate postgresql mongod nginx` (adjust MongoDB unit name as needed).
- Before schema updates, back up PostgreSQL with `pg_dump`, MongoDB with `mongodump`, and `/var/lib/dialygo/uploads` with a filesystem backup. Test restores and keep encrypted backups off-host. Choose a retention period/destination. Restore DBs and uploads to a coordinated point because records reference files.
- Keep the prior source/build revision. Roll back code only if the schema remains compatible. Migration downgrades may be destructive; otherwise restore matching DB backups with the previous app version. After deployment verify health, upload/OCR behavior, logs, disk space, and that DB ports are not externally reachable.

## HTTPS and public access (separate decision)

The sample Nginx site serves HTTP only with `server_name _` pending confirmation. Domain ownership, public reachability, and certificate process are not confirmed; SSH is VPN-only. Before public traffic, confirm domain and exposure policy, configure DNS and approved network access, obtain/renew a trusted TLS certificate, then add an HTTPS server block and HTTP redirect. Until then, test over the approved VPN path; do not assume a domain or open public firewall access.
