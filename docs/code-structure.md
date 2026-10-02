# Code structure

Monorepo with three apps and shared scripts. Start everything with `./start.sh` (pm2); details in `README.md`.

```
backend/    FastAPI + PostgreSQL (relational) + MongoDB (documents/OCR)
frontend/   React (CRA + craco) web app, role-based workspaces
mobile/     Expo / React Native patient & doctor app (separate client of the same API)
docs/       this file, frontend-api.md
memory/     PRD.md - product requirements and approved decisions (source of truth)
```

## Backend (`backend/`)

| Folder | Responsibility |
|---|---|
| `server.py` | App setup, CORS, mounts every router under `/api`, runs Alembic migrations on startup |
| `routers/` | HTTP layer, one file per area: `auth`, `patient`, `reports`, `insights`, `doctor`, `documents` (legacy, unauthenticated) |
| `routers/deps.py` | Auth dependencies: `current_user`, `current_patient`, `current_doctor`, doctor→patient authorization |
| `services/` | Logic without HTTP: `security` (hashing, JWT), `otp` (providers), `users` (user codes, masking), `logs` (audit/error), report/OCR pipeline |
| `models/sql_models.py` | SQLAlchemy tables. `migrations/` holds the Alembic history; `core/` has config, DB session, migration runner |
| `scripts/seed_mobile.py` | Idempotent demo accounts (one per role) |
| `tests/` | pytest API tests that run against a live server |

Identity model: `users` (login identity: `user_code`, `mobile_number`, `email`, `user_type`, `status`) has one profile row per
type: `patients`, `doctors` or `staff_profiles` (operator and the two admin types).

### Authentication flow

1. `POST /auth/send-otp` with a `user_code` (+ optional `user_type`, web) or `mobile_number` (mobile app). `resolve_login_mobile` finds the
   account, requiring it to exist and be `ACTIVE` for a user code. An OTP is generated, its HMAC hash stored in
   `otp_verifications`, and the configured `OtpProvider` "delivers" it (development: printed in the backend log).
2. `POST /auth/verify-otp` re-resolves the identifier, `consume_otp` checks expiry and attempt limit and the hash, and a
   JWT (`sub` = user id, `user_type`, 7-day expiry) is returned with the account context.
3. Every protected route reads `Authorization: Bearer <jwt>` via `deps.current_user`; role routes layer
   `current_patient` / `current_doctor` on top.
4. `GET /auth/session` returns the context for a token; `POST /auth/logout` only audit-logs (tokens are stateless).

Accounts are created by `POST /auth/signup` (provisioning) or the seed script; see `README.md`.

## Frontend (`frontend/src/`)

| Folder | Responsibility |
|---|---|
| `types/` | **All shared types**, exported from `@/types` (`api.ts`: results/hook types, `auth.ts`: backend responses + `UserDetails`, `profile.ts`: patient profile). See "Typing" below |
| `api/` | Raw endpoint functions, the only code that touches axios. `http.ts`: shared instance, token store, error normalisation, 401 handling. `auth.ts`, `client.js`: one file per feature. Documented in `docs/frontend-api.md` |
| `controllers/` | Each API function wrapped by `controller()` (`controller.ts`): never throws, always returns `{ ok, data, message, error }`. Grouped per feature, e.g. `AuthControllers`. This is what components consume |
| `hooks/useApi.ts` | `const [isLoading, apiTrigger, apiResponse, isApiHit] = useApi(Controller.fn, options)`. See "Calling the API" below |
| `context/AuthContext.tsx` | `AuthProvider`: holds the **real** session (`userDetails`, `userLoading`, `startSession`, `signOut`, `expireSession`) and verifies the stored token once on load. Read it through `useAuth` |
| `context/AppContext.js` | Mock workspace state (drafts, uploads, selected patient, ...). Reads the user from `AuthContext`; to be replaced as screens move to real APIs |
| `hooks/useAuth.ts` | `const { userLoading, userDetails } = useAuth()`: who is signed in (see "Session handling") |
| `lib/` | Small helpers: `jwt.ts` (client-side token expiry check), `format.ts` (mobile / date display), `utils.js` |
| `config/` | `roles.ts` (role ids, home routes, backend `userType` → role map), `nav.js` (sidebar per role) |
| `pages/` | One folder per role (`operator`, `doctor`, `patient`, `admin`) plus `Login.js` and `Roadmap.js` |
| `components/` | `layout/AppLayout` (shell, sidebar, profile menu), shared widgets, `ui/` (shadcn primitives) |
| `data/` | Synthetic mock data still used by the clinical screens |
| `App.js` | Provider order (`AuthProvider` → `AppProvider`) and role-guarded routes (`Shell`, `LoginGate`) |

### Typing

- New and auth/API code is TypeScript with `strict: true` (`tsconfig.json`); legacy mock-data screens and `api/client.js` remain
  JavaScript (`allowJs`, not type-checked) and are migrated as they are wired to the real API. `components/ui/{button,input,checkbox}`
  are typed because the login page uses them, and so is `components/Bits.tsx` (Panel, Metric, Field...). Props of a component are
  typed next to the component; types shared across files (API shapes, domain objects) go in `src/types/`.
- **Types live only in `src/types/`** and are imported with `import type { ... } from "@/types"`. Never redeclare a backend shape
  or hook type in a component, hook or api file; add or extend it there. Role and user-type maps in `config/roles.ts` are
  `Record<Role, ...>` / `Record<UserType, ...>`, so adding a role is a compile error until every map is updated.
- Check: `npm run typecheck` (also run on every dev-server compile and build).

### Calling the API from a component

```js
const [isSending, sendOtpApi, otpResponse, isApiHit] = useApi(AuthControllers.sendOtp);
const result = await sendOtpApi(userCode);     // form submit, mount effect, button... any trigger
if (result.ok) { /* result.data */ }
```

- **Add an endpoint:** write the function in `api/<feature>.js`, wrap it in `controllers/<Feature>Controllers.js`
  (`controller(fn, { requiresAuth: false })` for public endpoints, `successMessage` for a default success toast), list it in
  `docs/frontend-api.md`.
- **What `useApi` does on every trigger:**
  1. *Token guard*: for protected controllers, stops before the request when the stored token is missing, expired or
     malformed (`tokenStore.isValid`, local check only), ends the session and toasts. Public controllers skip this.
  2. Sets `isLoading`, calls the controller, stores `apiResponse` on success, sets `isApiHit` once a call has completed.
  3. *Toasts*: the response `message` (or the controller's `successMessage`) as success, the server error otherwise.
     Silence with `useApi(fn, { showSuccess: false, showError: false })`.
  4. *Auth errors*: a 401 calls `expireSession()` (clears token and user, `Shell` redirects to login) and toasts.
  5. Has its own try/catch; the trigger never throws and always resolves to the controller result.
- Inline form validation is still local state in the page; only server messages are toasts.
- `useApi` has no React-context dependency (it ends sessions through `notifyUnauthorized()` in `api/http.ts`), so `AuthProvider` itself uses it for the session check. `signOut` calls the logout controller directly.
- Tests: `src/hooks/useApi.test.tsx` (`CI=true npx craco test --watchAll=false`).

### Session handling (web)

- `AuthProvider` calls `GET /auth/session` through `useApi` once on load when a token is stored; `useAuth()` returns the result
  (`userLoading`, `userDetails`) to any component without extra requests. Home pages show the real name and user code via
  `components/UserWelcome.tsx` (the patient home uses `userDetails` in its header).

- `Login.js`: pick a role (workspace) and enter the user ID → `AuthControllers.sendOtp` → OTP field → `AuthControllers.verifyOtp` → `startSession` → navigate to `ROLES[role].home`. The role picked on screen is sent as `user_type`
  and the backend rejects an ID that is not of that type; the role used after login always comes from the backend session.
- `AuthContext` (`startSession`, `signOut`, `expireSession`) keeps `user` (`id` = user code, `name`, `role`, `title`, `unit`) derived from the backend session. The access
  token is stored in `localStorage` (`tokenStore`), so a reload restores the session via `GET /auth/session` while `Shell`
  shows a loading state.
- `Shell` redirects to login without a session and to the user's own home when the role is not allowed on a route.
  This is a UI convenience only; the backend enforces authorization.
- An expired or rejected token (401) clears the session everywhere; logout calls the backend, then clears local state.

### Known gaps

- Patients whose profile is not registered yet (`registrationRequired`) have no web registration screen (the profile page would show a "could not load" state for them).
- Profile page: UHID and dialysis vintage are not shown (no backend data); blood group is read-only; changing the registered mobile/email is not available.
- Clinical screens still read mock data; the authenticated `/reports`, `/insights` and `/doctor` APIs are not connected.
- Access token lives in `localStorage` (simple, XSS-exposed); revisit with httpOnly cookies before production.
