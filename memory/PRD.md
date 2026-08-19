# DURISE — Dialysis Procedure Operator Intelligence & Vascular Assessment (Phase-1)

## Original problem statement (verbatim intent)
Build a React application (Phase-1 on JSON mock data; Phase-2 to move to APIs with Postgres + MongoDB), responsive across mobile/Android/iOS and browser, with a landing page carrying operator login ID and a DPDP Act data-sharing acceptance disclaimer. The app must be medico-domain intuitive, include agentic/AI-style insight features, integrate dialysis machine APIs/telemetry, and send messages + PDF reports to the patient's WhatsApp number.

Phase-1 must NOT be positioned as a dialysis data-entry app. It is an Operator Intelligence & Vascular Assessment application built on the concept:
Patient Evidence → Historical Reconstruction → Vascular Profile → Current Dialysis Inputs → Operator Insight — collect broadly, present intelligently.

Core engine in Phase-1 is rule-based/illustrative. Predictive ML and angiogram image analysis are deferred. Genomic/DNA personalisation is explicitly out of scope.

**USP:** "Before every dialysis session, give the operator a consolidated view of the patient's historical dialysis, vascular-access and clinical evidence—so the current procedure is performed with context rather than isolated machine readings."

## User choices (confirmed)
- Data source: mock JSON only, frontend-only (no backend) for Phase-1
- Login: simple demo operator login (no password)
- Insight layer: rule-based engine only (no LLM)
- Telemetry: simulated stream; WhatsApp dispatch: MOCKED
- Visual style: clinical light theme

## Architecture (Phase-1)
- React 19 + React Router 7 SPA, Tailwind + shadcn/ui, recharts for trends, sonner for alarms/toasts
- No backend calls. Backend template (`/app/backend/server.py`) untouched.
- `src/data/mockData.js` — operators, 3 patients with full longitudinal evidence (sessions generated deterministically), WhatsApp templates
- `src/lib/engine.js` — rule-based core engine: `rangeOf`, `trendOf`, `contextFor`, `buildInsight` (attention points, risk flags, session tuning, access status, vascular trend, Plan Now / Plan Next)
- `src/context/AppContext.js` — operator session (localStorage), per-patient session drafts (before/during/after/signOff), WhatsApp dispatch log
- Pages: `Login.js`, `PatientRoster.js`, `PatientDashboard.js`
- Tabs: `OverviewTab`, `VascularTab`, `HistoryTab`, `SessionTab` (incl. TelemetryPanel), `ReportTab`

## User personas
1. **Dialysis procedure operator / technician** — primary user; needs context before cannulation and during the run.
2. **Charge nurse** — reviews attention points and access risk across the worklist.
3. **Nephrologist** — reviews and signs off the engine's prescription recommendations.

## Core requirements (static)
- Operator login + DPDP Act 2023 consent gate; route protection
- Consolidated historical evidence: sessions, machine parameters, pre/post observations, complications/alarms, prescriptions, medications, labs + trends, hospitalizations, procedures, documents, clinical notes, vascular records
- Vascular Access Intelligence + Vascular Access Timeline
- Current session capture in Before / During / After stages
- Contextualisation of every current value against previous 10-session range
- Operator dashboard with Attention Points
- Rule-based Prescription Report: session tuning, access status check, vascular condition trend, risk flags, Plan Now / Plan Next, clinician sign-off
- Machine telemetry with alarms; WhatsApp text + PDF dispatch
- Responsive, tablet-first, glove-friendly touch targets

## Implemented (2026-06-19)
- Login page with operator ID, demo ID chips, DPDP consent checkbox, inline validation errors
- Session Worklist with search, per-patient risk tier and high-attention preview
- Patient dashboard header (risk, attention count, comorbidities) + 5 main tabs
- Pre-dialysis dashboard: Attention Points (rule engine), Current Session prescription, Vascular Access summary with trend badge, Recent Dialysis charts + table, Clinical Evidence panel
- Vascular tab: Access Profile, Access Flow Surveillance chart with 600 mL/min threshold, cannulation record chart, Vascular Access Timeline (colour-coded event types)
- Historical evidence tab: sessions table (17 columns), labs table + trend charts, medications, admissions & procedures, documents, clinical notes
- Session tab: simulated machine telemetry (Fresenius 4008S) with flash-on-update, VP/AP alarm toasts and alarm log; Before/During/After input stages with live historical-range context lines; Historical Evidence + Current Condition panel
- Report tab: engine-derived session tuning with rationale, access status check, vascular condition trend, 5 risk flags, Plan Now / Plan Next, clinician sign-off gate, PDF via print stylesheet, MOCKED WhatsApp dispatch log
- Verified end-to-end by the testing agent: 18/18 flows passing, mobile 390x844 clean

## Backlog
### P0 (Phase-2 foundation)
- FastAPI backend + MongoDB/Postgres persistence; replace mockData with API layer
- Real operator auth (JWT or Emergent Google auth) with audit logging of DPDP consent
- Real machine telemetry ingestion (device API / HL7 gateway) and session persistence
- WhatsApp Business API (Twilio/Meta) for real message + PDF delivery; server-side PDF generation

### P1
- Document upload + scanned report retrieval (object storage)
- Session completion → immutable session record + auto-populate next session's history
- Multi-unit / multi-facility roles (nurse, nephrologist, admin) and access control
- Offline-capable capture for intermittent connectivity in dialysis bays

### P2
- LLM/RAG narrative summaries over longitudinal evidence (agentic layer)
- Predictive access-dysfunction model; angiogram image analysis (COG Vascular Access programme)
- Patient-facing view of their own trends

## Next tasks
1. Stand up Phase-2 backend contract (patients, sessions, vascular events, labs, documents) and swap the data layer
2. Persist completed sessions so the engine reads real history instead of seeded JSON
3. Wire real WhatsApp + server-side PDF once credentials are available
