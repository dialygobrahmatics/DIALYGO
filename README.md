# DialyGo

## Run the backend locally on Windows

The backend uses PostgreSQL for relational data and MongoDB for document, OCR,
and clinical-insight data. Both are required. Uploaded
files are stored locally under `backend/storage` by default.

### Prerequisites

- Python 3.10 or newer.
- PostgreSQL 14+ running locally or reachable, with a database and user created.
- MongoDB running locally or a MongoDB service you can reach. The application
  requires `MONGO_URL` and `DB_NAME`; no MongoDB credentials are included here.
- Tesseract OCR installed for Windows and available on `PATH`. The Python
  `pytesseract` package calls the separate Tesseract executable when OCR is needed.

### Setup

Open PowerShell in the repository and create/activate a virtual environment:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use this for the current terminal session and
activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Install the pinned backend dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Create `backend/.env` and set `MONGO_URL`, `DB_NAME` and `DATABASE_URL`
(e.g. `postgresql+asyncpg://dialygo:dialygo@localhost:5432/dialygo`). Keep private
values in `.env`; do not commit it. `DATABASE_URL` has no default. The `STORAGE_DIR`
setting may be omitted; uploads default to `backend/storage`.

### Start

From the activated virtual environment and the `backend` directory:

```powershell
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

On startup, the server attempts to apply Alembic migrations to the configured
relational database. Check the startup logs for migration errors; migration
failures are logged by the application. The API health endpoint is
`http://127.0.0.1:8000/api/health`.

Tesseract is only needed for OCR operations, but install it before trying document
OCR. The default local OCR implementation uses Tesseract and PyMuPDF.

## Run everything with pm2

`./start.sh` checks PostgreSQL and MongoDB (starting local ones via brew if needed), makes sure the ports are
free, then starts the backend (`:8000`) and frontend (`:3000`) under pm2 and waits for both to respond.
Run `./start-backend.sh` once first to create the Python venv, and `npm install` in `frontend/`.

```bash
./start.sh            # start (default)
./start.sh status     # database checks + pm2 status
./start.sh restart    # after backend code changes (the backend does not auto-reload)
./start.sh stop       # stops only the dialygo-* pm2 apps
BACKEND_PORT=8001 FRONTEND_PORT=3001 ./start.sh   # if the default ports are taken
```

PostgreSQL is required (the script aborts without it). An unreachable MongoDB only produces a warning, since sign-in
does not use it. Process definitions are in `ecosystem.config.js`; the frontend gets `REACT_APP_BACKEND_URL` and the
backend gets `CORS_ORIGINS` from it, so no frontend `.env` is needed.

## Patient profile API

`GET /api/patient/profile` (patient token) returns `patient`, `account` (user code, the patient's own mobile and email, last login),
`details` (blood group, emergency contact, known allergies, occupation) and `consents` (data sharing, privacy notice,
research, last updated). `PATCH /api/patient/profile` accepts any subset of `name`, `date_of_birth`, `gender`, `email`,
`mobile_number` (no OTP needed), `blood_group`, `emergency_contact`, `known_allergies`, `occupation`, `consent_data_sharing`, `consent_privacy_notice`,
`consent_research` and returns the same shape; an empty string clears a text field. The master details and consents are
columns on `users`. Full field list and rules: `memory/PRD.md` §6.2.

## Authentication API

All routes are under `/api/auth`. Delivery is chosen with `OTP_PROVIDER` in `backend/.env`:

| `OTP_PROVIDER` | Behaviour |
|---|---|
| `log` | Random 6-digit code printed in the backend log as `[DEV OTP] ...` (`pm2 logs dialygo-backend`). Development only. |
| `mock` | Fixed code `123456` (`OTP_FIXED_CODE`) also returned as `devOtp`. Needed by the automated tests and the mobile README's test accounts. Default while `OTP_DEBUG=true` if unset. |
| `random` | Real random code, but no email/SMS delivery is implemented yet. |

No email, SMS or WhatsApp service exists yet; add one as another `OtpProvider` in `services/otp.py`.

The web frontend's API calls are documented in [`docs/frontend-api.md`](docs/frontend-api.md); the overall layout and the
auth/session flow in [`docs/code-structure.md`](docs/code-structure.md).

| Endpoint | Purpose |
|---|---|
| `POST /send-otp` | `{user_code}` (web) or `{mobile_number}` (mobile app) → `{requestId, mobileNumber, email, expiresInSeconds, channel}`. A `user_code` must belong to an existing active account (404 / 403 otherwise). |
| `POST /verify-otp` | `{user_code \| mobile_number, otp}` → `{accessToken, userType, registrationRequired, profile}` |
| `POST /signup` | Register any account type (below) |
| `GET /session` | Current user (Bearer token) |
| `POST /logout` | Audit-logs the logout (Bearer token) |

### Sign up

Call `send-otp` for the mobile number, then `POST /api/auth/signup`:

```json
{
  "user_type": "PATIENT | DOCTOR | OPERATOR | DIALYSIS_ADMIN | TECH_ADMIN",
  "name": "Full Name",
  "mobile_number": "9876543210",
  "otp": "123456",
  "email": "optional@example.com"
}
```

Extra fields by type: `PATIENT` needs `aadhaar_number` (plus optional `date_of_birth`, `gender`); `DOCTOR` needs
`registration_number` (optional `specialization`); operators and admins take optional `designation` and `unit`.
All types may also send `blood_group`, `emergency_contact`, `known_allergies`, `occupation` and the consent booleans
(`consent_data_sharing`, `consent_privacy_notice`, `consent_research`), validated exactly like `PATCH /patient/profile`.

A `user_code` is generated for every account (`DUR-PT-00218`, `DOC-0071`, `OPR-0001`, `ADM-0001`).
Patients are active immediately and receive an `accessToken`. All other types are created as
`PENDING_APPROVAL` and cannot sign in until `users.status` is set to `ACTIVE` (there is no approval endpoint yet).
Duplicate mobile number, email, Aadhaar or registration number returns `409`.

Dev seed accounts (`python -m scripts.seed_mobile`), matching the IDs on the web login screen: patients
`DUR-PT-00218` (9876543210) and `DUR-PT-00341`, doctors `DOC-0071` (9876500001) and `DOC-0088`, operators
`OPR-1041`, `OPR-2276`, `OPR-3390`, dialysis admin `ADM-0002`, tech admin `ADM-0001`.

