# Apple IAP Position

Why we believe the app passes Apple review without integrating In-App Purchase, even though the underlying service is a paid subscription.

## TL;DR

The mobile app is a **read-only companion** to a service the user already pays for on the web. It:

1. Never displays a "Subscribe" or "Upgrade" button.
2. Never shows prices.
3. Provides only an "Open Stripe billing portal" link, which opens in an in-app browser owned by the user's existing account.

This pattern is explicitly permitted by App Store guidelines 3.1.3 (Reader Apps) and 3.1.3(a) (Multiplatform Services), reinforced by the 2022 Reader App entitlement.

## The relevant guidelines

- **3.1.1** — apps unlocking content via IAP must use Apple IAP. **Does not apply** because we do not unlock content via the iOS app.
- **3.1.2** — auto-renewable subscriptions disclosure requirements. **Does not apply** because no subscription is sold inside iOS.
- **3.1.3** — reader apps: "the following apps may allow account creation for use of such content, including subscriptions, with the App Store provided the developer offers the user the ability to use the content elsewhere".
- **3.1.3(a)** — multiplatform services: "Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired in your app on other platforms or your web site".

## How our app maps to these

| Behavior | Apple's concern | Our position |
| --- | --- | --- |
| Sign-in with existing account | Permitted; required for multiplatform | Phone/email/username OTP — no signup, no purchase. |
| Display of user's data | App Functionality | Stats, account, billing status — all data the user already has. |
| Reference to subscription | Permitted | Read-only display of "Status / Plan / Next billing". |
| "Manage subscription" button | This is the sensitive area | Opens an externally-issued Stripe customer-portal URL in `expo-web-browser`. URL is fetched from our backend at runtime; we do not show a price, do not initiate a checkout. |
| In-app subscription purchase | Would require IAP | Not offered. |
| "Upgrade your plan" call to action | Would require IAP | Not offered in v1. |

## What we deliberately do NOT do

- Show pricing of any tier inside the app.
- Show a "Subscribe" / "Start free trial" / "Upgrade" button.
- Promote the web pricing page.
- Funnel signups through external website links from inside iOS (would trigger 3.1.1).
- Initiate Stripe Checkout from iOS (would trigger 3.1.1).

## If Apple still pushes back

Expected reviewer pushback scenarios and pre-canned responses:

1. **"The Manage Subscription button is a CTA to an external purchase."**
   Response: The link opens the Stripe Customer Portal, which is a billing-management surface for users who already have an active subscription. It does not allow new subscriptions to be created from within the iOS context for that user; the portal is gated on an existing customer ID.

2. **"You must use IAP for digital subscriptions."**
   Response: Per guideline 3.1.3(a), apps that operate across multiple platforms may allow users to access subscriptions acquired on another platform. The subscription was acquired on thetrackerapp.io (web) prior to install; iOS users can use, but not purchase or upgrade, that subscription inside the app.

3. **"Where can a user sign up?"**
   Response: The bot (SMS / iMessage / Telegram) is the primary signup channel. The web site (thetrackerapp.io) provides an onboarding form. The iOS app is intentionally not a signup surface.

## What changes if/when we add in-app subscription purchasing

If a future version of the iOS app adds a "Subscribe" button, every option below has a tradeoff:

| Option | Cost to us | UX |
| --- | --- | --- |
| Add Apple IAP for iOS | Apple takes 15–30% | Cleanest for iOS users; price parity with Stripe required. |
| Apply for External Link Account Entitlement | Free if approved; requires a static disclosure sheet | Routes user to web checkout. Allowed only in specific categories. |
| Apply for Music/Video/Reader entitlement variations | N/A — we are neither | — |
| Stay subscription-purchase-free on iOS | $0 | Status quo; v1 plan. |

For v1, **stay subscription-purchase-free on iOS** is unambiguously the right call.

## Reviewer notes template

Paste this into App Store Connect → App Review Information → Notes:

```
TheTrackerApp is the mobile companion to thetrackerapp.io, a fitness-tracking
service that users primarily interact with via SMS / iMessage / Telegram /
WhatsApp bots. Users sign up and subscribe on the web at thetrackerapp.io
before installing the iOS app.

The iOS app is a read-only mirror: users can view their workout history,
account details, billing status, and the Google Sheet that powers their
tracking. No content is sold, no subscriptions are offered for purchase
inside the app, and no pricing is shown. The "Manage subscription" button
opens the Stripe customer portal (https://billing.stripe.com/p/session/...)
in a Safari View Controller for users who already have an active
subscription; it is a billing-management surface, not a purchase surface.

Demo credentials are provided in the Demo Account fields above. Sign in
with the provided phone number; we will deliver the 8-character OTP code
directly to the reviewer email registered on this Apple Developer account
within 5 seconds of submission via the auth flow's "Send code" button.
```
