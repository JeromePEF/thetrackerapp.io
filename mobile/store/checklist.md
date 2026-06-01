# Pre-Submission Checklist

A linear walkthrough from "I have a built app" to "live in both stores". Tackle in order.

---

## Phase 0 — Backend prerequisites (blocks everything)

- [ ] **Add `DELETE /api/account` endpoint** that wipes the user's row from the auth table and revokes active session tokens. Both stores reject apps without in-app account deletion.
- [ ] Add a "Delete account" button to `mobile/src/app/(tabs)/account.tsx` that calls it after a confirm dialog and signs out.
- [ ] Confirm `https://thetrackerapp.io/privacy` loads and reflects mobile collection (see `privacy-data-safety.md`).
- [ ] Confirm `https://thetrackerapp.io/terms` loads and mentions Stripe handles billing.

---

## Phase 1 — Developer accounts

### Apple Developer Program (Organization)

- [ ] Obtain a D-U-N-S number for the legal entity at https://developer.apple.com/enroll/duns-lookup/ (free; 1–2 weeks).
- [ ] Sign in to https://developer.apple.com/programs/enroll/ with the Apple ID that will own the account.
- [ ] Pay the $99 USD annual fee.
- [ ] Wait for Apple to confirm enrollment (typically 1–5 business days after DUNS verification).
- [ ] Once approved, sign in to https://appstoreconnect.apple.com.
- [ ] Create a new App: `TheTrackerApp`, bundle ID `io.thetrackerapp.app`, SKU `tracker-mobile-001`.

### Google Play Console (Organization)

- [ ] Sign in to https://play.google.com/console/signup with the Google account that will own it.
- [ ] Choose "Organization" account type.
- [ ] Pay $25 USD one-time registration fee.
- [ ] Complete identity verification (Google requires DUNS or business registration docs + a verified phone).
- [ ] Once approved, click "Create app", name `TheTrackerApp`, default language English, app type "App", free, accept declarations.
- [ ] Set package name `io.thetrackerapp.app` (this is permanent — cannot be changed later).

---

## Phase 2 — Assets

(See `assets-spec.md` for sizes.)

- [ ] Master 1024×1024 icon
- [ ] Android adaptive icon foreground + background + monochrome
- [ ] Splash logo
- [ ] 5 × iPhone 6.9" screenshots (1320×2868)
- [ ] 5 × iPad 13" screenshots (2064×2752)
- [ ] 5 × Android phone screenshots (1080×1920+)
- [ ] 1024×500 Google Play feature graphic
- [ ] 512×512 Google Play icon

---

## Phase 3 — Configure EAS & build

- [ ] `cd mobile && npm install -g eas-cli && eas login`
- [ ] `eas build:configure` (creates `mobile/eas.json`)
- [ ] Copy the printed EAS project ID into `mobile/app.json` → `expo.extra.eas.projectId`
- [ ] `eas build --platform ios --profile preview` → produces a signed `.ipa` ready for TestFlight
- [ ] `eas build --platform android --profile preview` → produces a signed `.aab` for internal testing
- [ ] Verify both builds install on physical devices via TestFlight + Play Console internal track

---

## Phase 4 — Listings

### App Store Connect

- [ ] Paste fields from `listings.md` § Apple
- [ ] Upload screenshots + icon
- [ ] Fill App Privacy nutrition label per `privacy-data-safety.md` § Apple
- [ ] Fill age-rating questionnaire (4+)
- [ ] Set pricing to Free, all territories
- [ ] Attach privacy policy URL + terms URL
- [ ] Set "Sign-in required" → Yes; provide demo credentials Apple reviewers can use (use a test account, document in App Review Information)

### Play Console

- [ ] Paste fields from `listings.md` § Google
- [ ] Upload screenshots + feature graphic + icon
- [ ] Fill Data Safety form per `privacy-data-safety.md` § Google
- [ ] Complete content rating questionnaire (Everyone)
- [ ] Set target audience age (18+)
- [ ] Declare "Government apps", "News apps", "Health apps" answers (None / No / No-special)
- [ ] Attach privacy policy URL
- [ ] App access form — provide demo credentials so Google can sign in to review

---

## Phase 5 — Submission

### Apple

- [ ] Upload `.ipa` via EAS Submit or Transporter
- [ ] In App Store Connect → assign the build to the version
- [ ] Submit for review
- [ ] First-review SLA: typically 24–48 hours; sometimes up to a week
- [ ] If rejected, fix issues in Resolution Center and resubmit

### Google

- [ ] Upload `.aab` via EAS Submit or directly in Play Console
- [ ] Promote internal track → closed track → production
- [ ] Org accounts: production review typically 1–7 days
- [ ] If your account is brand new and somehow ends up on the personal-account ruleset, you must run a 14-day closed test with 12+ testers first

---

## Phase 6 — Post-launch

- [ ] Set up `eas update` channels (production / preview) so you can ship JS fixes without going through review
- [ ] Add `expo-application` to read the runtime version and let users see what version they're on inside the app
- [ ] Monitor App Store Connect crash reports + Play Console vitals weekly
- [ ] Renew Apple Developer membership annually (auto-renews if billing is set up)
