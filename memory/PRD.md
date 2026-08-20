# Dialyso — Dialysis Procedure Operator Intelligence & Vascular Assessment (Phase-I prototype)

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
- Layout: persistent left sidebar (Dialyso brand, role modules, active highlight, collapsible, mobile sheet) + top bar
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
- 2026-06-20 — Restructure: role-based sidebar/topbar SaaS shell, four role workspaces (35+ screens), role isolation guards, demo role switcher, topbar search & notifications, operator 12-step pre-session workflow with checklist and cannulation early-warning panel, visible core-engine run, doctor clinical review with approve/return propagating to operator machine insights, patient portal with mock OTP/consent/upload, 11 admin modules, Future Roadmap page, compliance wording clean-up. Verified 26/27 by testing agent; search-popover UX and wording findings fixed afterwards.

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
