# Store Listings — App Store + Play Store

Copy-paste-ready text for both stores. Character limits enforced per field.

---

## Apple App Store Connect

### App Information

| Field | Limit | Value |
| --- | --- | --- |
| **App Name** | 30 | `TheTrackerApp` |
| **Subtitle** | 30 | `Workouts, food, body data` |
| **Primary category** | — | `Health & Fitness` |
| **Secondary category** | — | `Productivity` |
| **Bundle ID** | — | `io.thetrackerapp.app` |
| **Support URL** | — | `https://thetrackerapp.io` |
| **Marketing URL** | optional | `https://thetrackerapp.io` |
| **Privacy Policy URL** | required | `https://thetrackerapp.io/privacy` |
| **Terms of Use URL** | required if subscriptions | `https://thetrackerapp.io/terms` |

### Promotional Text (≤170 chars — editable any time without review)

```
Your workouts, meals, and body measurements — pulled straight from the bot you already use. Read-only dashboard for everything you've logged.
```
*(146 chars)*

### Description (≤4000 chars)

```
TheTrackerApp is the mobile companion to the fitness-tracking service you already use on iMessage, SMS, WhatsApp, Telegram, or the web.

Everything you've logged — workouts, calories, water, supplements, body weight, body-fat percentage — already lives in your private Google Sheet. This app gives you a clean, fast way to check that data on the go without scrolling through chat history or opening a browser.

WHAT YOU CAN DO
• See your last 7 days at a glance — workouts logged, calories tracked, gallons of water drunk
• Open your linked Google Sheet directly from your phone
• View your account details — username, email, phone, account ID
• Check your subscription status and open the Stripe customer portal to manage billing
• Switch between accounts by signing out and signing back in

HOW IT WORKS
Sign in with the same phone number, email, or Telegram username you registered with the bot. We send you an 8-character code, you enter it, and you're in. Your session is stored securely in iOS Keychain so you don't have to log in every time.

NOTE: This is a read-only mirror of the web dashboard. To actually log workouts or meals, message the bot like you always do. We deliberately kept the app minimal so it stays fast and gets out of your way.

PRIVACY
We collect only what's needed to authenticate you and show you your data. We don't share your information with third parties for advertising. Stripe handles all payment data — we never touch your card. Full policy: thetrackerapp.io/privacy
```

### Keywords (≤100 chars, comma-separated, no spaces)

```
fitness,workout,tracker,calories,water,weight,body,measurements,gym,health,log,nutrition,google,sheet
```
*(98 chars)*

> Tip: Apple does not see your title and category in keyword matching, so don't repeat them here. The keywords above are the ones Apple actually indexes.

### What's New (release notes — ≤4000 chars)

```
First release. Sign in with your phone, email, or @username; see your last 7 days at a glance; open your Google Sheet; manage your subscription. Read-only by design — log workouts in the bot like you always do.
```

### Age Rating Questionnaire

| Question | Answer |
| --- | --- |
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Sexual content or nudity | None |
| Profanity or crude humor | None |
| Alcohol, tobacco, drugs | None |
| Simulated gambling | None |
| Horror/fear themes | None |
| Mature/suggestive themes | None |
| Medical/treatment information | **Infrequent/Mild** — app displays user-entered body-weight and body-fat data |
| Unrestricted web access | No (in-app browser opens only Google Sheets and Stripe portal URLs) |
| User-generated content | No |

**Expected rating: 4+**

### Pricing & Availability

| Field | Value |
| --- | --- |
| Price tier | **Free** (subscriptions managed on web/Stripe — no in-app purchases) |
| Availability | All territories |

> Heads-up: Apple's IAP rule (3.1.1) requires digital subscriptions sold to iOS users to go through Apple's IAP system **if the app provides the subscription purchase flow on iOS**. Because our app intentionally does NOT offer subscription purchase from inside the app (Billing tab is read-only and links to Stripe customer portal), Apple's "Reader App" / "External Link Account Entitlement" path applies. See `mobile/store/apple-iap-position.md` for the full position.

---

## Google Play Console

### Store Listing

| Field | Limit | Value |
| --- | --- | --- |
| **App name** | 30 | `TheTrackerApp` |
| **Short description** | 80 | `Mobile dashboard for your workout, food, and body-measurement logs.` |
| **Category** | — | `Health & Fitness` |
| **Tags** | up to 5 | `Fitness`, `Lifestyle`, `Productivity` |
| **Email** | required | (your support email) |
| **Phone** | optional | leave blank |
| **Website** | — | `https://thetrackerapp.io` |
| **Privacy policy** | required | `https://thetrackerapp.io/privacy` |

### Full Description (≤4000 chars)

```
TheTrackerApp is the mobile companion to the fitness-tracking service you already use on SMS, WhatsApp, Telegram, or the web.

Everything you've logged — workouts, calories, water, supplements, body weight, body-fat percentage — already lives in your private Google Sheet. This app gives you a clean, fast way to check that data on the go.

WHAT YOU CAN DO
• See your last 7 days at a glance — workouts logged, calories tracked, gallons of water drunk
• Open your linked Google Sheet directly from your phone
• View your account details
• Check your subscription status and manage billing through the Stripe customer portal
• Sign out and switch accounts any time

HOW IT WORKS
Sign in with the same phone number, email, or Telegram username you registered with the bot. We send you an 8-character code, you enter it, and you're in. Your session is stored securely on-device.

This is a read-only mirror of the web dashboard. To log new entries, message the bot like you always do. We kept the app minimal on purpose so it stays fast.

PRIVACY
We collect only what's needed to authenticate you and show your data. We don't share your information with third parties for advertising. Stripe handles all payment data. Full policy: thetrackerapp.io/privacy
```

### Content Rating (IARC Questionnaire)

| Question | Answer |
| --- | --- |
| Violence | None |
| Sexual content | None |
| Profanity | None |
| Controlled substances | None |
| Gambling | None |
| User-generated content | No |
| Shares user location | No |
| Allows users to interact | No |
| Digital purchases | **No** (subscription purchases happen on web; the mobile app only links to Stripe portal for management) |

**Expected rating: Everyone**

### Target Audience

- Target age range: **13–17, 18+** (broad — health/fitness)
- App not specifically designed for children
- No ads
- Required disclosure: app handles health data → Play requires the "Health Connect" declaration **only if** integrating with Google Health Connect. We do not, so this stays unset.

### Data Safety Form

See `mobile/store/privacy-data-safety.md` for the full per-field answers.

### Pricing & Distribution

| Field | Value |
| --- | --- |
| Free or Paid | Free |
| In-app purchases | None on Android (Stripe portal is external) |
| Countries | All available |
| Contains ads | No |

---

## Submission Order We Recommend

1. **Lock the bundle ID** in both consoles before any build (`io.thetrackerapp.app`).
2. **Resolve account deletion gap** (see "Known blockers" below) — this is a *hard* requirement on both stores and will get the app rejected.
3. **Generate proper screenshots + icon + feature graphic** (see `mobile/store/assets-spec.md`).
4. **Fill privacy / data-safety forms** (see `mobile/store/privacy-data-safety.md`).
5. **Submit to Apple TestFlight (internal) first** — fastest feedback loop, no public review.
6. **Submit to Google internal testing track** in parallel.
7. **Promote to production** on both stores only after at least one round of internal testing.

---

## Known blockers (must fix before submission)

| Blocker | Store | Required by | Fix |
| --- | --- | --- | --- |
| **No in-app account deletion** | Both | Apple guideline 5.1.1(v) since Jun 2022 + Play "Account deletion" policy since Dec 2023 | Backend must add `DELETE /api/account` (or equivalent). App needs an "Delete account" button on the Account tab that calls it and signs out. Until shipped, both stores will reject. |
| Apple subscription disclosure | Apple | Apple guideline 3.1.2 | Already covered by linking to Stripe portal externally + showing "Manage subscription" copy. No IAP. Should pass review as a "reader-style" companion app. |
| Privacy nutrition / data safety | Both | Both stores' policies | Forms must be filled before first submission. Draft answers in `privacy-data-safety.md`. |
| Privacy policy URL must be live | Both | Both stores | Already live at `https://thetrackerapp.io/privacy` — verify the URL still loads. |
