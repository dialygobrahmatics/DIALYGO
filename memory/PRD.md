# DialyGo — Dialysis Procedure Operator Intelligence & Vascular Assessment (Phase-I prototype)

## Phase-I USP
"Before every dialysis session, give the operator a consolidated view of the patient's historical dialysis, vascular-access
and clinical evidence—so the current procedure is performed with context rather than isolated machine readings."

Final clinical decisions remain with qualified healthcare professionals. Every engine output is labelled
**Prototype Analysis · Decision Support Only · Requires Qualified Clinical Review**.

## Phase-I scope guardrails
Rule-based, illustrative, mock-data core engine only. Explicitly NOT implemented: predictive ML, image/angiogram analysis,
autonomous machine control, real OCR, real device or HIS integration, LLM/RAG. Hereditary/gene-level personalisation is out of
scope and is not captured, displayed or on the roadmap.

## Architecture
- React 19 SPA (frontend-only, no backend). Tailwind + shadcn/ui, recharts, sonner, react-router 7.
- Layout: persistent left sidebar (DialyGo brand, role modules, active highlight, collapsible, mobile sheet) + top bar
  (home icon, breadcrumb, patient search, notifications, profile menu with demo role switcher and logout) + content area.
- `src/config/nav.js` — per-role module lists and breadcrumbs
- `src/components/layout/AppLayout.js` — shell chrome
- `src/context/AppContext.js` — ROLES, role-aware login, switchRole, active patient, session drafts, sign-off, uploads, engine runs, WhatsApp log
- `src/lib/engine.js` — rule engine: `rangeOf`, `trendOf`, `contextFor`, `buildInsight` (attention points, risk flags, session tuning, access status, vascular trend, Plan Now / Plan Next)
- `src/data/mockData.js` (3 patients, full longitudinal evidence) and `src/data/adminData.js` (users, ingestion, integrations, fleet, audit, roadmap)
- `src/components/CoreEngineRunner.js` — 8-step visible consolidation run
- Reused tab components: `OverviewTab`, `VascularTab`, `HistoryTab`, `SessionTab` (telemetry), `ReportTab`

## Roles & modules
- **Operator** (primary): Home, Patient Search, Pre-Session Review, Current Session, Patient History, Vascular Access, Machine Insights, Procedure Support, Session Reports. 12-step workflow strip; machine insights withheld until clinician approval.
- **Doctor**: Home, Patients, Patient 360°, Clinical History, Dialysis History, Vascular Access, Core Analysis, Reports, Clinical Review (approve / return for review).
- **Patient / Guest**: Home, My Health, Upload Data (mock), My Reports, Dialysis Overview, Medical History, Profile (mock OTP, KYC, consent, missing-data completion).
- **Admin**: Home, Users & Profiles, Patients, Doctors, Operators, Data Ingestion, Data Integration, Historical Data, Machine Insights, Reports, Settings.
- Shared: Future Roadmap page, everything labelled "Future Release – Not Available in Phase I".

## Prescription report sections
1 Session tuning recommendation (Decision Support Recommendation label) · 2 Access status check · 3 Vascular condition trend ·
4 Risk flags · 5a Plan Now · 5b Plan Next · 6 Clinician sign-off (Approved / Returned for Review, timestamped).

## Implemented
- 2026-06-19 — Phase-I MVP: DPDP login, worklist, pre-dialysis dashboard, vascular timeline, historical evidence, session capture with historical-range context, simulated telemetry, rule-based prescription report, sign-off gate, MOCKED WhatsApp dispatch. Verified 18/18.
- 2026-06-20 — Role-based restructure: sidebar/topbar SaaS shell, four role workspaces, role isolation, demo role switcher, operator 12-step pre-session workflow, visible core-engine run, doctor clinical review approve/return propagating to operator machine insights, patient portal, admin modules, Future Roadmap. Verified 26/27.
- 2026-06-20 (later) — **DialyGo rebrand + visual system**: app renamed DialyGo → DialyGo; theme aligned to dialygo.in (navy #0A3D62 sidebar/gradients and headings, saffron #E48404 primary CTAs, sky tint #DBEAFE chips, dashed evidence grids, 14px rounded soft-shadow cards, Plus Jakarta Sans headings + IBM Plex Sans/Mono data). Admin split into **Dialysis Admin** (`/clinical-admin/*`: patients, doctors, operators, historical data, reports, clinical governance) and **Technical Admin** (`/tech-admin/*`: users, ingestion, integration, machine insights, historical data, settings) — five roles total. No functional or workflow changes.

- 2026-06-20 (later still) — Operator/Patient/Doctor/Reports increment: cosmetic file upload on the Operator dashboard (any file type, filename + green "Uploaded" label, file never read) that opens an "Enter Patient Details" modal (Name, Age, Gender, UHID, Diagnosis, Access Type, Access Flow, Next Session, Schedule); Submit appends ONE new patient card built from the existing card component into the shared patient list (visible in both Operator and Doctor sections) without touching the three seeded patients or any summary counter; "Run Report" on the new card only with three states (Idle → 2.5s "Analyzing..." with spinner → static report card with summary, one risk flag, one recommendation); doctor name changed everywhere to Dr. Girish Reddy; breadcrumb made functional for the Patients flow (Home > Patients > [Patient] > [Sub-page]) with clickable parent segments, other pages unchanged. Verified 13/13 by testing agent; the two flagged gaps (active-patient chip and Run Report state lost on navigation) were fixed by lifting report state into AppContext.

- 2026-06-20 (final increment) — Brand logo swapped to the supplied DialyGo logo image (`/dialygo-logo.png`, used as-is, unmodified) in the sidebar header (expanded + collapsed) and on the login/workspace page, keeping existing placement/sizing/spacing; doctor name corrected everywhere to **DR. Gireesh Reddy**; new **COG (Core Objective and Goal)** field added to every patient card (seeded per patient, auto-generated for operator-added patients).

- 2026-06-21 — Demo access gate added to the existing "Choose your workspace" page (no new screen): ID field label made role-neutral ("User ID"), new Password field below it, single hardcoded demo password `DialyGo2026` (constant `DEMO_PASSWORD` in AppContext) checked against the existing mock IDs per role (`validIdsByRole` built from operators / doctorsDirectory / patients / ADM-0001 / ADM-0002). Failure shows one generic inline error "Invalid ID or password."; success sets `dialygo_demo_access=true` in localStorage so the Password field is skipped for the rest of the demo session. Quick-select chips, role cards and the DPDP consent block are unchanged. No backend, no hashing — demo access control only, not real security.

- 2026-06-27 — Demo password gate TEMPORARILY DISABLED (commented out, not removed) on the login page: the Password input block in `Login.js` and the password + "ID must match a known mock ID" checks in `AppContext.login()` are commented with `// TEMP DISABLED - PASSWORD CHECK - re-enable if needed`. `DEMO_PASSWORD` and `validIdsByRole` are retained for restoration. Role + any ID + DPDP consent is now sufficient to enter. Logout still clears `dialygo_demo_access`.

## Backlog
### P0 (Phase-2)
- FastAPI backend + MongoDB/Postgres persistence, replace mock data layer
- Real authentication per role with audit logging of DPDP consent
- Persist sessions, sign-offs and uploads (currently in-memory)
### P1
- Object storage for real document upload/retrieval
- Real machine telemetry ingestion and real WhatsApp + server-side PDF
- Facility/multi-unit scoping and granular permissions
### P2
- LLM/RAG narrative summaries, predictive access-dysfunction models, angiogram image analysis (all roadmap-labelled today)

## Next tasks
1. Define the Phase-2 API contract for patients, sessions, vascular events, labs and sign-offs
2. Persist sign-off and session drafts so state survives reload
3. Wire real WhatsApp/PDF dispatch once credentials are available
