# Dialygo Mobile (React Native + Expo + TypeScript)

The mobile client for Dialygo. This folder is the **source of truth** for the Android and iOS app.
The Expo **web** export in `../frontend/public/mobile` exists only for browser-based QA.

## Prerequisites
- Node.js 20+
- Expo Go on your phone (App Store / Play Store), or an Android emulator / iOS simulator

## Setup

```bash
cd mobile
npm install            # or: yarn install
```

Create a `.env` file in this folder (it is not committed):

```
EXPO_PUBLIC_API_URL=https://<your-dialygo-backend-host>
```

Use your deployed Dialygo backend URL, or your machine's LAN IP with the local backend port
(e.g. `http://192.168.1.10:8001`) — `localhost` will not resolve from a physical phone.

## Run

```bash
npx expo start          # then scan the QR code with Expo Go
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Rebuild the web QA preview (only needed inside the Emergent workspace)

```bash
npx expo export --platform web --output-dir ../frontend/public/mobile --clear
```

Then open `{BACKEND_URL}/mobile/index.html`. Enter at `index.html` — in the dev preview, other
`/mobile/*` paths are not statically served.

## Native builds

```bash
npx eas build --platform android
npx eas build --platform ios
```

Bundle identifiers are already set to `in.dialygo.mobile` in `app.json`.

## Structure

```
app/                 expo-router routes
  index.tsx          splash + session restore
  auth/              login, otp, register, onboarding-upload
  patient/           tabs: home, reports, insights, profile
  reports/           upload, [id] (detail + OCR polling)
  doctor/            tabs: home, patients, profile (Phase 2 shell)
components/          UI primitives, header, tab bar, cards
services/            REST client + auth/patient/reports/doctor APIs, secure token storage
hooks/               useApi (loading / error / refresh states)
store/               auth context + post-login routing
theme/ types/        design tokens and shared types
```

## Test accounts (development)

| Account | Mobile | OTP |
|---|---|---|
| Patient (Ravi Kumar) | 9876543210 | 123456 |
| Doctor (DR. Gireesh Reddy) | 9876500001 | 123456 |
| New patient | any other valid 10-digit number | 123456 |

The OTP is mocked while `OTP_DEBUG=true` on the backend. Disable it in production.
