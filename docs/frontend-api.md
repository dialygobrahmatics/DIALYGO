# Frontend → backend API reference

Every HTTP call the web frontend (`frontend/`) makes to the FastAPI backend. **Update this file in the same change
whenever a call is added, changed or removed.**

## Conventions

- All calls use the shared axios instance in `frontend/src/api/http.ts`. Base URL is
  `${REACT_APP_BACKEND_URL}/api` (default `http://localhost:8000/api`; `ecosystem.config.js` sets it under pm2).
- Feature modules wrap the instance and return the response **body** (not the axios response):
  `src/api/auth.ts` (authentication), `src/api/client.js` (documents / OCR). Components never call axios directly.
- Components call endpoints through controllers and the `useApi` hook (`src/controllers/*`, `src/hooks/useApi.ts`), which add
  the token guard, loading state, toasts and 401 handling; see `docs/code-structure.md`. The "Frontend function" column
  below is the raw function; its controller has the same name in `AuthControllers`. Legacy document calls in
  `api/client.js` are still called directly.
- The access token is kept in `tokenStore` (`localStorage["dialygo_access_token"]`) and an `Authorization: Bearer <token>`
  header is added automatically. Any `401` on a request that carried a token clears it and sends the user back to login
  (via `setUnauthorizedHandler`, registered by `AuthContext`).
- Failures reject with `ApiError { message, status }`. `message` is taken from FastAPI's `detail` and is safe to show
  to the user; `status` is `0` when the server could not be reached.
- Swagger for the backend: http://127.0.0.1:8000/docs. Backend auth/sign-up behaviour: `README.md`, `memory/PRD.md` §6.1. How the frontend is organised: `docs/code-structure.md`.

## Connected endpoints

| Status | Method & path | Frontend function (file) | Used by | Auth | Request → response |
|---|---|---|---|---|---|
| ✅ | `POST /auth/send-otp` | `sendOtp(userCode, userType)` (`api/auth.ts`) | `pages/Login.tsx` | none | `{user_code, user_type}` → `{requestId, mobileNumber (masked), email (masked \| null), expiresInSeconds, channel}`. 404 unknown user ID or account type that does not match the role picked on the login screen, 403 inactive account. In development the OTP is printed in the backend log (`[DEV OTP]`), see `OTP_PROVIDER`. |
| ✅ | `POST /auth/verify-otp` | `verifyOtp(userCode, otp, userType)` (`api/auth.ts`) | `pages/Login.tsx` → `AuthContext.startSession` | none | `{user_code, otp, user_type}` → `{accessToken, userCode, userType, registrationRequired, profile}`. 400 wrong/expired OTP, 429 too many attempts, 403 inactive. |
| ✅ | `GET /auth/session` | `fetchSession()` | `AuthProvider` on page load (via `useApi`) | Bearer | → `{userId, mobileNumber (masked), userCode, userType, registrationRequired, profile}`. 401 = expired token. |
| ✅ | `POST /auth/logout` | `logout()` | `AuthContext.signOut` (profile menu) | Bearer | → `{success}`; audit-logged. The JWT is stateless, so the client simply discards it. |
| ✅ | `GET /patient/profile` | `getProfile()` (`api/profile.ts`) | `pages/patient/PatientProfile.tsx` on mount | Bearer (patient) | → `{patient, account {userCode, mobileNumber, email, userType, lastLoginAt}, details {bloodGroup, emergencyContact, knownAllergies, occupation}, consents {dataSharing, privacyNotice, research, updatedAt}}`. 403 if not a patient, 404 if registration is incomplete. |
| ✅ | `PATCH /patient/profile` | `updateProfile(payload)` → `ProfileControllers.saveDetails` / `saveConsents` | `PatientProfile.tsx` (the two Save buttons) | Bearer (patient) | `{emergency_contact?, known_allergies?, occupation?, consent_*?}` (any subset; `""` clears a text field). The API also accepts `name`, `date_of_birth`, `gender`, `blood_group`, `email` and `mobile_number` (no OTP); the page does not edit those yet → the full updated profile. 400 invalid value, 409 email/mobile already used. |
| ⚠️ legacy | `POST /documents` (multipart) | `uploadDocument` (`api/client.js`) | `PatientUpload` | **none** | `file, patient_id, document_type?, uploaded_by?` → document + OCR job |
| ⚠️ legacy | `GET /documents?patient_id=` | `listDocuments` / `getDocuments` | `OcrDocuments` | **none** | → documents list |
| ⚠️ legacy | `GET /documents/{id}` | `getDocument` | unused | **none** | → document |
| ⚠️ legacy | `GET /documents/{id}/text` | `getDocumentText` | `OcrDocuments` | **none** | → extracted text |
| ⚠️ legacy | `GET /ocr/jobs/{id}` | `getOcrJob`, `pollOcrJob` | `PatientUpload` | **none** | → job status (`queued`/`processing`/`processed`/`failed`) |
| ✅ | `GET /health` | `health` | unused | none | → `{status, service}` |

⚠️ legacy: the Mongo-backed documents API predates authentication and is unauthenticated; it is to be replaced by
`/reports/*` (see below).

## Backend endpoints not yet used by the frontend

| Endpoint | Notes |
|---|---|
| `POST /auth/signup` | Provisioning; not a user-facing screen |
| `POST /patient/register`, `GET /patient/dashboard` | |
| `POST /reports/upload`, `GET /reports`, `GET /reports/{id}`, `/reports/{id}/file`, `/reports/{id}/ocr` | Authenticated replacement for `/documents` |
| `GET /insights` | |
| `GET /doctor/profile`, `/doctor/patients`, `/doctor/patients/{id}` | |

Move a row into the table above when its call is wired.
