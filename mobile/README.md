# TheTrackerApp Mobile

Read-only iOS + Android mirror of the dashboard, built with **Expo (React Native) + TypeScript + Expo Router**.

## What's here today

| Route | Backed by | Purpose |
| --- | --- | --- |
| `/(auth)/login` | `POST /api/auth/login-code/request` | Phone / email / @username entry |
| `/(auth)/verify` | `POST /api/auth/login-code/verify` | 8-char OTP entry, persists session token to SecureStore |
| `/(tabs)/stats` | `GET /api/stats/range` | Workouts / calories / water for last 7 days |
| `/(tabs)/account` | `GET /api/portal` | Username, email, phone, age, account ID |
| `/(tabs)/billing` | `GET /api/portal` | Status, plan, next-billing, "Manage subscription" → Stripe portal |
| `/(tabs)/sheet` | `GET /api/portal` | "Open Sheet" → user's Google Sheet |
| `/(tabs)/export` | — | Stub for v2 (CSV/JSON ports of the web client-side exporter) |

All requests hit `https://api.thetrackerapp.io` directly with `Authorization: Bearer <sessionToken>` — no Vercel proxy, no cookies. See `src/lib/api/client.ts`.

## Quick start

```bash
cd mobile
npm install
npx expo install --check        # aligns dep versions with the installed Expo SDK
npm start                       # opens the dev server
```

Then either:
- Scan the QR code with **Expo Go** on your iPhone or Android device, or
- Press `i` for iOS Simulator (requires Xcode), `a` for Android Emulator (requires Android Studio), or `w` for web preview.

## Project layout

```
mobile/
  src/
    app/                   expo-router routes
      _layout.tsx          root: AuthProvider + theme
      index.tsx            redirect to /(auth)/login or /(tabs)/stats
      (auth)/              login + OTP screens
      (tabs)/              5 dashboard tabs
    lib/
      api/
        client.ts          fetch wrapper + ApiError + token attach
        auth.ts            requestLoginCode / verifyLoginCode w/ fallback paths
        portal.ts          /api/portal + /api/stats/range
        types.ts           response shapes
      session.ts           SecureStore (iOS Keychain / Android Keystore) wrapper
    state/
      auth.tsx             AuthProvider + useAuth + useContact hooks
    components/, constants/, hooks/   (untouched starter template helpers)
  app.json                 Expo config (bundle id: io.thetrackerapp.app)
  package.json             SDK 56, React 19, RN 0.85
```

## Bundle identifiers

| Store | ID |
| --- | --- |
| iOS `bundleIdentifier` | `io.thetrackerapp.app` |
| Android `package` | `io.thetrackerapp.app` |

Reserve these in App Store Connect and Play Console *before* your first EAS build so the certificates Expo provisions are bound correctly.

## Building for the stores (EAS)

After accounts are approved:

```bash
npm install -g eas-cli
eas login                          # use the Expo account you'll own the app under
eas build:configure                # one-time: creates eas.json
eas build --platform ios --profile preview     # internal TestFlight build
eas build --platform android --profile preview # internal Google Play closed-test build
eas submit -p ios --latest         # uploads to App Store Connect → TestFlight
eas submit -p android --latest     # uploads to Play Console
```

Apple requires the Apple Developer Program membership active before `eas submit -p ios` works. Google requires the Play Console account paid + identity-verified.

## Adding the EAS project ID

Once `eas build:configure` runs the first time, copy the printed project ID into `app.json` at `expo.extra.eas.projectId`. It's the only manual bookkeeping step.

## Things deliberately out of scope for v1

- Write paths (edit profile, save goals, send AI chat) — by design, this is a read-only mirror.
- Push notifications — would require APNs cert + FCM key + a backend endpoint to store device tokens.
- Native CSV/JSON export — coming in v2 via `expo-file-system` + `expo-sharing`, mirroring the web exporter in `src/dashboard.js`.
- Affiliate, Groups, Run Clubs, Personal Trainer, AI tabs — same reason; v1 = "check my data on the go".

## Backend contract notes

- Mobile assumes the `/api/portal?contact=<canonical>` endpoint returns Account + Billing + Sheet data in one call (matches the web behavior at `src/dashboard.js:960`).
- Mobile assumes `POST /api/auth/login-code/{request,verify}` (with `/api/auth/code/...` and `/api/login-code/...` fallbacks) is reachable cross-origin from the device. CORS must allow `*` or list `null` origin since native fetch sends no Origin header.
- No `Set-Cookie` reliance anywhere; verified during audit.
- Logout is local-only (`SecureStore.delete`). No `/api/auth/logout` exists.
