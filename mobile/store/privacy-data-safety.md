# Privacy Nutrition Label (Apple) + Data Safety Form (Google)

Both stores ask the same questions in different wording. Answers below match what the mobile app actually does today — verified against `mobile/src/lib/api/`.

---

## Apple — App Privacy "Privacy Nutrition Label"

In App Store Connect → App Privacy.

### Data Collected and Linked to the User

| Data Type | Used for | Linked to user | Used for tracking |
| --- | --- | --- | --- |
| **Phone Number** | App Functionality (login) | Yes | No |
| **Email Address** | App Functionality (login), Account Management | Yes | No |
| **User ID** (`accountId`, `canonical`) | App Functionality, Account Management | Yes | No |
| **Health & Fitness — Other Health Data** (workout count, calories tracked, water intake, body weight, body fat) | App Functionality, Analytics | Yes | No |
| **Device ID** | Analytics (Crashlytics-equivalent only if added later) | Optional | No |

### Data NOT Collected

- Precise location, coarse location
- Contacts
- Photos / videos / camera
- Microphone / audio
- Browsing history, search history
- Purchases (handled by Stripe on web, not us)
- Payment info (handled by Stripe on web, not us)
- Diagnostics beyond crash reports (not enabled today)
- Advertising data
- Sensitive personal info

### Tracking

> Does your app use data for tracking?

**No.** We do not link user data with third-party data for advertising, do not pass data to data brokers, do not measure ad effectiveness across other apps/websites. Apple's "Tracking" definition is strict and we meet none of the criteria.

→ This means **we do NOT need the App Tracking Transparency (ATT) prompt**.

---

## Google Play — Data Safety Form

In Play Console → App content → Data safety.

### Data collection and security

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** — every request is HTTPS to api.thetrackerapp.io. |
| Do you provide a way for users to request that their data be deleted? | **Yes — but this requires shipping in-app account deletion first** (see Blockers in `listings.md`). The honest answer right now is "No"; flip to "Yes" once the delete-account flow is wired in. |

### Personal info

| Data type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Name | No | — | — | — |
| Email address | **Yes** | No | Required (one of phone/email/username) | Account management |
| User IDs | **Yes** | No | Required | Account management |
| Address | No | — | — | — |
| Phone number | **Yes** | No | Required (one of phone/email/username) | Account management |
| Race or ethnicity | No | — | — | — |
| Political/religious beliefs | No | — | — | — |
| Sexual orientation | No | — | — | — |
| Other info | No | — | — | — |

### Health and fitness

| Data type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Health info | **Yes** | No | Optional | App functionality + analytics. Includes weight, body-fat %, workouts, calories, water. |
| Fitness info | **Yes** | No | Optional | App functionality + analytics. |

### Financial info

| Data type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Payment info | **No** — handled entirely by Stripe outside our app. | — | — | — |
| Purchase history | **No** — Stripe holds this. | — | — | — |

### App activity / app info / device or other IDs

| Data type | Collected | Shared |
| --- | --- | --- |
| App interactions | No (we don't track screen navigation today) |
| In-app search history | No |
| Other user-generated content | No |
| Other actions | No |
| Crash logs | No (turn this on if you add Sentry/Crashlytics later) |
| Diagnostics | No |
| Device or other IDs | No |

### Security practices

| Question | Answer |
| --- | --- |
| Is your data encrypted in transit? | **Yes** |
| Do you follow Google Play's Families Policy? | **No** (app is not directed at children) |
| Independent security review | No |

---

## Required updates to the web privacy policy

Apple and Google both check that the privacy policy at `https://thetrackerapp.io/privacy` discloses everything in the labels above. Audit the existing policy for these specific points before submission:

- [ ] States that we collect phone number and/or email for authentication
- [ ] States that fitness/health metrics are collected and stored
- [ ] States that Stripe processes all payment data
- [ ] States that the mobile app stores a session token on-device in iOS Keychain / Android Keystore
- [ ] Provides a clear method for the user to request account + data deletion (this is also gated on the in-app deletion endpoint)

If any are missing, update `privacy.html` before submission.
