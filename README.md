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
