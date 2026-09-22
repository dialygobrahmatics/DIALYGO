# Dialygo — Product Requirements (living document)

## 1. Original problem statement (web, Phase 1 — delivered)
"Dialysis Procedure Operator Intelligence (DialyGo)": a React decision-support dashboard giving a consolidated view of
patient demographics, historical dialysis evidence and vascular-access intelligence before every session. Role-based
access (Patient, Doctor, Operator, Technical Admin, Dialysis Admin) on mock clinical data plus a client-side
rule-based insight engine. Later extended with a real FastAPI + MongoDB backend for medical PDF/image upload and
unverified OCR text extraction (PyMuPDF + Tesseract).

## 2. Original problem statement (mobile — Phase 1 delivered 2026-09-22)
Add a production-quality **mobile client** for the existing Dialygo app without breaking the web app:
React Native + Expo + TypeScript + Expo Router under `/mobile` as the source of truth, plus an Expo **web** export for
in-environment visual/functional QA. NephroPlus-inspired mobile UX with Dialygo branding only (no NephroPlus assets).
**No role-selection screen** — the backend identifies the account after OTP login and routes to the patient or doctor
experience. Aadhaar is the unique patient identifier, stored hashed and always displayed masked. PostgreSQL is the
production store for structured relational data (SQLAlchemy + Alembic; SQLite locally until a Neon/Supabase URL is
supplied); MongoDB stores medical documents and OCR data. The mobile app talks only to the FastAPI REST API.

## 3. Clinical safety constraints (non-negotiable)
- Every engine/insight output is decision support only and requires qualified clinical review. Nothing diagnoses.
- OCR text and OCR-derived values are UNVERIFIED and labelled as such wherever displayed.
- OCR output must never feed the web `src/lib/engine.js` rule engine, web labs, prescriptions or risk flags.
- Insight language stays observational: "observed trend", "potential clinical consideration", "discuss with your
  treating clinician".

## 4. Architecture
```
React (web, unchanged)        React Native / Expo (/mobile)
            \                        /
             \      HTTPS REST      /
              ---->  FastAPI  <-----
                      |    |
      SQLAlchemy + Alembic  MongoDB (Motor)
              |                  |
        PostgreSQL (prod)   medical_documents
        SQLite (local dev)  ocr_results
                            clinical_insights
                            documents / ocr_jobs (legacy web)
                      |
            storage.py (local disk today) + ocr.py (PyMuPDF/Tesseract) + classifier.py
```

### Backend layout
- `core/config.py` (env + load_dotenv), `core/sql.py` (async engine/session), `core/migrate.py` (alembic on startup),
  `core/db.py` (Mongo collections + serialisers)
- `models/sql_models.py` — the 11 approved tables, `models/types.py` — portable GUID / JSONB
- `migrations/` — Alembic (async env), `scripts/seed_mobile.py` — idempotent demo seed
- `routers/` — `auth.py`, `patient.py`, `reports.py`, `insights.py`, `doctor.py`, `deps.py`, `documents.py` (legacy web)
- `services/` — `security.py`, `otp.py`, `logs.py`, `extraction.py`, `insights.py`, `report_pipeline.py`,
  `ocr.py`, `storage.py`, `classifier.py`

### Mobile layout (`/mobile`)
`app/` (expo-router: `index` splash, `auth/login|otp|register|onboarding-upload`, `patient/` tabs,
`reports/upload|[id]`, `doctor/` tabs, `doctor-patient/[id]`, `notifications`, `privacy`, `edit-profile`,
`+not-found`), `components/`, `services/`, `hooks/`, `store/`, `theme/`, `types/`.

## 5. Approved database design (SOURCE OF TRUTH — do not redesign silently)
PostgreSQL: `users, patients, doctors, doctor_patients, medical_reports, dialysis_sessions, vitals, lab_results,
audit_logs, error_logs, otp_verifications` — implemented 1:1 from the user-supplied DBML.
MongoDB: `medical_documents, ocr_results, clinical_insights` (mobile) and the untouched legacy web collections
`documents`, `ocr_jobs`.
Known deviation to resolve later: the legacy web upload flow still writes `documents`/`ocr_jobs`; the approved
collections are used by the mobile pipeline. A migration to unify them has NOT been approved yet.

## 6. Key API endpoints
- Auth: `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `GET /api/auth/session`, `POST /api/auth/logout`
- Patient: `POST /api/patient/register`, `GET|PATCH /api/patient/profile`, `GET /api/patient/dashboard`
- Reports: `POST /api/reports/upload`, `GET /api/reports`, `GET /api/reports/{id}`, `GET /api/reports/{id}/ocr`
- Insights: `GET /api/insights`
- Doctor: `GET /api/doctor/profile`, `GET /api/doctor/patients`, `GET /api/doctor/patients/{id}`
- Legacy web (unchanged): `POST /api/documents`, `GET /api/documents?patient_id=`, `GET /api/documents/{id}/text`,
  `GET /api/ocr/jobs/{jobId}`, `GET /api/health`

## 7. Implemented
- 2026-06-19 → 2026-09-01 — Web Phase-I MVP, role-based restructure, DialyGo rebrand + visual system, operator/doctor/
  patient/admin workspaces, demo password gate (currently TEMP DISABLED on purpose), FastAPI+MongoDB OCR MVP,
  documents rendered in the patient record, keyword medical-document classifier, logo sizing. (See git history.)
- 2026-09-22 — **Mobile Phase 1 (Patient MVP)**:
  - Approved 11-table relational schema via SQLAlchemy 2.0 async + Alembic; SQLite locally, PostgreSQL-ready
    (switch by changing `DATABASE_URL`, then `alembic upgrade head`). Migrations run on backend startup.
  - Mobile-number + mock-OTP auth (`OtpProvider` abstraction, fixed code while `OTP_DEBUG=true`, hashed OTPs,
    5-attempt lockout, expiry), JWT bearer tokens, SecureStore on device / localStorage on web.
  - Aadhaar identification: HMAC-SHA256 hash with a pepper, unique constraint, masked display only; duplicate
    Aadhaar returns 409.
  - Backend-enforced authorization: patients see only their own data; doctors only assigned patients
    (`doctor_patients`); cross-role access returns 403/404.
  - Report pipeline reusing the existing services: validation (`classifier.py`) → storage → MongoDB
    `medical_documents` + `ocr_results` → PyMuPDF/Tesseract OCR → regex field extraction into `lab_results`/`vitals`
    → PostgreSQL `medical_reports` status UPLOADED/PROCESSING/COMPLETED/FAILED/REJECTED.
  - Rule-based mobile clinical insights (ATTENTION / MONITOR / STABLE) cached in `clinical_insights`.
  - Audit logging (login, logout, registration, report uploaded/rejected/viewed, profile updated, doctor access) and
    DB-backed error logging with a 1-year retention purge on startup.
  - Expo app: splash with session restore, login, OTP, new-patient registration, previous-report onboarding upload,
    patient dashboard, reports list with filters, upload flow (camera/gallery/PDF) with rejection handling, report
    detail with OCR polling, insights, profile, edit profile, notifications and privacy screens, logout; custom
    Dialygo bottom navigation with a central upload action; loading skeletons, empty, error, retry and
    pull-to-refresh states throughout. Doctor tabs (home/patients/search/detail/profile) exist as the Phase-2 shell.
  - Expo web export served for QA at `{REACT_APP_BACKEND_URL}/mobile/index.html`.
  - Verified by iteration_6: 25/26 backend pytest cases and all Phase-1 mobile flows; the one CRITICAL finding
    (seed script loaded a different Aadhaar pepper) was fixed by loading `.env` inside `core/config.py` and reseeding.

- 2026-09-22 (later) — **Secure document access + media-kind storage layout**: uploads are now written to
  `patients/<patient-id>/<kind>/<document-id>.<ext>` where kind is `pdf` / `images` / `videos` / `audio` / `other`
  (`services/storage.py: media_folder`). New `GET /api/reports/{id}/file` streams the original document through the
  backend with authorization enforced server-side (patient → own reports only, doctor → assigned patients only,
  rejected reports never served, 401 without a token); it accepts the token either as a bearer header or as
  `?auth=` so native/browser viewers that cannot send headers still work, and every access is audit-logged as
  `REPORT_FILE_VIEWED`. Storage keys are never exposed to clients. Mobile report detail gained a Document card
  (`components/DocumentPreview.tsx`) with an inline image preview, an open-original action for PDFs and a
  download action. Storage remains local disk behind the unchanged `StorageBackend` interface — cloud object
  storage was explicitly deferred by the user.
## 8. Backlog
### P0
- Supply the Neon/Supabase `DATABASE_URL` and run the migrations against real PostgreSQL (SQLite is temporary).
### P1
- Phase 2 doctor experience in full: dialysis history, vitals, lab results, vascular access, timeline, richer
  patient detail and assignment management.
- Cloud object storage (Azure Blob / S3) behind the existing `StorageBackend` interface — local disk is not durable.
- Human confirmation workflow before OCR-extracted values are treated as clinical data.
- Real SMS OTP provider behind `OtpProvider`; disable `OTP_DEBUG` in production.
- Push notifications (report processed, new insight, dialysis reminder) — architecture is prepared, not wired.
### P2
- Unify the legacy web `documents`/`ocr_jobs` collections with `medical_documents`/`ocr_results` (needs approval).
- Migrate the web app's mock `AppContext`/localStorage state onto the real API.
- Serve all `/mobile/*` paths from the Expo `index.html` in the dev preview so hard refreshes on in-app routes work.
- LLM/RAG narrative summaries, predictive access-dysfunction models, angiogram image analysis.

## 9. Next tasks
1. Wire real PostgreSQL once the connection string is available and re-verify.
2. Build the Phase-2 doctor modules on the already-authorised endpoints.
3. Replace local disk storage with cloud object storage.
