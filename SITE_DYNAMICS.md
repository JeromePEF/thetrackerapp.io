# Site Dynamics — The Tracker App Frontend

Snapshot of how the production site behaves as of the latest deploy (`dpl_DvKT3Z5oP1C1ZMsmRKRA9nMYYef1`).

---

## Hosting & domains

| Domain | Purpose |
|---|---|
| `https://thetrackerapp.io` | Marketing site (public, no auth required) |
| `https://dashboard.thetrackerapp.io` | Logged-in dashboard (auth required) |

Both domains are aliases for the same Vercel project (`prj_cA6relgBMfSrT6Vj0HRqNFlFv28n`). Same `dist/` is served from both — routing decisions are made client-side based on `window.location.host`. `vercel.json` redirects `dashboard.thetrackerapp.io/` → `/dashboard` so the landing page on that subdomain is the dashboard.

**Backend** lives off-Vercel at `https://api.thetrackerapp.io` (Cloudflare Tunnel to a self-hosted `basicTextServer.js`). Frontend talks to it directly (CORS is `*`) — no API proxying for affiliate routes. Two Vercel serverless functions (`api/signup-proxy.js`, `api/login-code-request.js`, `api/login-code-verify.js`) exist as legacy fallback proxies for the iMessage/SMS onboarding and OTP login paths.

---

## Pages

### Marketing (`thetrackerapp.io`)

| Route | File | Notes |
|---|---|---|
| `/` | `index.html` + `src/main.js` | Hero signup form (iMessage/SMS/Telegram), live leaderboard, step counter. Captures `?ref=` on landing → cookie + localStorage. |
| `/workout-resources` | `workout-resources.html` | Static resource library |
| `/run-clubs` | `run-clubs.html` | Run club directory |
| `/personal-trainers` | `personal-trainers.html` | PT directory |
| `/login` | `login.html` + `src/login.js` | OTP login. Segmented control: Phone / Email / Username. Phone auto-formats `XXX-XXX-XXXX`. Reads `?email=` / `?phone=` / `?identifier=` for prefill. |
| `/authorize` | `authorize.html` + `src/authorize.js` | OTP code entry. On verify, redirects to `next=` (restricted to `dashboard.thetrackerapp.io`) with `auth_payload` + `session_token` in the URL. |
| `/affiliate/signup` | `affiliate/signup.html` + `src/affiliate-signup.js` | **Login-gated.** Logged-out → bounces to `/login?next=…`. Logged-in → form with name, social, audience, notes (email derived from session). Already-an-affiliate → "You're already an affiliate" + dashboard link. |
| `/affiliate/dashboard` | `affiliate/dashboard.html` + `src/affiliate-dashboard.js` | Full affiliate view: referral link + copy, click/signup/conversion counts, calculated/held/sent earnings, Stripe Connect button, referred subscriber list. |
| `/affiliate/connect?complete=1` | `affiliate/connect.html` + `src/affiliate-connect.js` | Stripe return URL. Re-fetches `/api/affiliate/status` and shows `chargesEnabled` / `payoutsEnabled` / status. Offers a "Resume onboarding" button if not yet active. |

### Dashboard (`dashboard.thetrackerapp.io`)

| Route | File | Notes |
|---|---|---|
| `/dashboard` | `dashboard.html` + `src/dashboard.js` | Tabbed UI. **Inline `<script>` in `<head>` blocks unauthenticated visitors before any markup renders** — synchronous redirect to `/login?next=…` if no session. Tabs: Account, Stats, Export, Goals, Billing, Integrate, AI, Sheet, Personal Trainer (conditional), Affiliate (conditional). |

---

## Auth flow

1. User visits any protected page → bounced to `https://thetrackerapp.io/login?next=<original>`
2. User picks Phone/Email/Username, enters value, submits
3. FE POSTs to `/api/login-code-request` (Vercel proxy → backend `/api/auth/login-code/request`) — backend sends OTP via SMS / email / Telegram and returns a `requestId`
4. Browser redirected to `/authorize?request_id=…` with pending state in localStorage
5. User enters OTP → FE POSTs to `/api/login-code-verify` → backend returns `{ account, sessionToken, sessionExpiresAt }`
6. FE writes `tracker.authenticated=true`, `tracker.auth.user` (the account object), `tracker.auth.session` (`{ token, expiresAt }`) to localStorage
7. Browser navigates to `next=` with `auth_payload` (base64 JSON of the user) + `session_token` + `session_expires_at` query params
8. Destination page's `persistAuthFromQuery()` reads those params, persists into its own origin's localStorage (cross-origin via URL — each origin holds its own copy), strips the params from the URL

Session token is used for `Authorization: Bearer <token>` on affiliate API calls. Backend gap: most non-affiliate routes still identify the user by email/phone in the payload, not by session token.

---

## Affiliate flow

### Become an affiliate

1. Logged-in user clicks "Become an affiliate" — visible in the dashboard's **Goals** tab and **Billing** tab (the CTA shows there only when the user has *no* affiliate profile)
2. Lands on `/affiliate/signup` (already authenticated; otherwise the page redirects through `/login` and back)
3. Submits form → `POST https://api.thetrackerapp.io/api/affiliate/signup` with name / social / audience / notes + identity fields from session (`email`, `accountId`, `canonical`)
4. Backend creates an affiliate row keyed by canonical email and returns `{ ok: true, affiliateSignup, affiliate }`. Affiliate gets a `referralCode` like `EMAIL-DERIVED-CODE`
5. Frontend redirects to `/dashboard` — the new **AFFILIATE** tab appears in the sidebar (was hidden), populated from `/api/affiliate/status`

### Sharing the link

The affiliate's share link is `https://thetrackerapp.io/r/<referralCode>`. **The backend `/r/:code` endpoint is not yet implemented** (backend punch-list item) — until it exists, the safe URL to share is `https://thetrackerapp.io/?ref=<code>` because the marketing site already captures `?ref=` on landing via `src/affiliate-ref.js` (30-day cookie + localStorage). When users sign up, the captured ref is attached to the signup payload as `affiliateCode` / `referralCode`.

### Stripe Connect (payouts)

1. Affiliate clicks "Connect Stripe" in `/dashboard` (Affiliate tab) or `/affiliate/dashboard`
2. FE POSTs `/api/affiliate/connect` → backend calls `stripe.accountLinks.create({ type: 'account_onboarding', return_url, refresh_url })` and returns `{ onboardingUrl }`
3. FE redirects to that URL → user completes Stripe onboarding
4. Stripe redirects back to `https://dashboard.thetrackerapp.io/affiliate/connect?complete=1`
5. That page re-fetches `/api/affiliate/status`; if `stripeAccountStatus === "active"` or `chargesEnabled && payoutsEnabled`, it shows "You're all set." Otherwise: "Almost there" + "Resume onboarding" button.

Backend gap: the `account.updated` webhook from Stripe Connect needs to flip `stripeAccountStatus` on the affiliate record. Until it's wired, the connect return page may show "Almost there" indefinitely even after Stripe approval.

---

## Local state (localStorage)

Per-origin (the dashboard and marketing site each have their own copies):

| Key | Set by | Read by | Purpose |
|---|---|---|---|
| `tracker.authenticated` | `authorize.js`, `dashboard.js` (URL hydration) | All gated pages | Boolean flag |
| `tracker.auth.user` | Same | All gated pages | User account object: `{ accountId, email, username, method, credential, canonical, … }` |
| `tracker.auth.session` | Same | `src/api.js` (`authHeaders()`) | `{ token, expiresAt }` — sent as `Authorization: Bearer` for affiliate calls |
| `tracker.affiliate.email` | `affiliate-signup.js`, `affiliate-dashboard.js` | Fallback identity when no session | Cached email |
| `tracker.affiliateRef` | `affiliate-ref.js` | `submitSignup` → POST body | Captured `?ref=` value |
| `tracker_ref` (cookie, 30d) | `affiliate-ref.js` | `affiliate-ref.js` | Same as above, cookie copy |

Plus dashboard-specific state: `tracker.dashboard.goals`, `tracker.dashboard.ai.sessions`, `tracker.unitSystem`.

---

## Backend coupling

What the frontend assumes about `api.thetrackerapp.io`:

**Working (verified live, May 2026):**
- `GET /health` → 200
- `POST /api/affiliate/signup` → 200 with `{ ok, affiliateSignup, affiliate }`
- `GET /api/affiliate/status?email=…` → 200 with `{ ok, affiliate, referrals, history, stats }` or 404 `{ ok: false, error: "affiliate not found" }`

**Currently flaky (return 500/502):**
- `POST /api/auth/login-code/request` — login flow blocked
- `POST /api/onboarding` — marketing signup blocked

These are server-side handler issues, not network/tunnel/CORS. Cloudflare reaches the backend; the handlers throw or hang.

**Backend punch list (in priority order):**

1. **Fix `/api/auth/login-code/request`** — currently the largest blocker; nothing in the dashboard or affiliate flow works without it
2. **Add `/r/:code`** click-redirect endpoint (302 to marketing with `?ref=` and drop a backend-side cookie)
3. **Listen for Stripe `account.updated`** on a separate Connect webhook endpoint with its own secret; flip `stripeAccountStatus = "active"` when `charges_enabled && payouts_enabled`
4. **Honor `Authorization: Bearer <session_token>`** on `/api/affiliate/{status,history,connect,signup}` so the FE can stop passing email in plaintext
5. **Idempotency on `stripe.transfers.create`** + persist `transferId` on the referral before flipping `BASIC_TEXT_ENABLE_AFFILIATE_PAYOUT_TRANSFERS=1`

---

## Build & deploy

- Build: `npm run build` → `dist/` (Vite, 10 HTML entry points)
- Local dev: `npm run dev` → `http://localhost:5173`
- Deploy prod: `vercel deploy --prod --yes` (CLI 50.39.0 installed, project linked at `.vercel/project.json`)
- Vite config: `vite.config.js` declares all HTML entry points under `rollupOptions.input`
- Routing: `vercel.json` has `cleanUrls: true` (so `/login` serves `dist/login.html`) and one redirect (`dashboard.thetrackerapp.io/` → `/dashboard`)

---

## File layout (relevant subset)

```
thetrackerapp.io/
├── index.html, login.html, authorize.html, dashboard.html  (marketing + dashboard pages)
├── workout-resources.html, run-clubs.html, personal-trainers.html
├── affiliate/
│   ├── signup.html
│   ├── dashboard.html
│   └── connect.html
├── src/
│   ├── main.js              (marketing landing)
│   ├── login.js             (segmented OTP login, phone formatter)
│   ├── authorize.js         (OTP verify → cross-origin redirect to dashboard)
│   ├── dashboard.js         (tabbed dashboard, affiliate widget)
│   ├── affiliate-signup.js  (login-gated signup form)
│   ├── affiliate-dashboard.js
│   ├── affiliate-connect.js
│   ├── affiliate-ref.js     (?ref= → cookie + payload attachment)
│   └── api.js               (all API helpers, session-bearer auth)
├── api/
│   ├── login-code-request.js, login-code-verify.js  (Vercel serverless proxies)
│   └── signup-proxy.js
├── auth-pages.css, affiliate.css, styles.css
├── vite.config.js, vercel.json, package.json
└── .vercel/project.json
```

---

## Known limitations (FE side)

- **Client-side auth gate only.** The inline `<head>` script in `dashboard.html` prevents flash-of-unauth-content but anyone determined can set the localStorage flag in DevTools. Real security comes from the backend rejecting bad/missing session tokens — not from this guard.
- **Defensive parsers.** `affiliate-dashboard.js` and the dashboard's affiliate panel accept many field-name variants (`referralCode` / `code` / `affiliateCode`, `totalPayoutsCalculatedCents` / `calculatedCents`, etc.) so the FE doesn't break if the backend response shape evolves. Once the shape is locked, these can be tightened.
- **Cross-subdomain ref cookie.** `tracker_ref` is host-only (`thetrackerapp.io`), not `.thetrackerapp.io`. That's intentional — the dashboard origin doesn't need it — but it does mean the cookie won't propagate to `dashboard.thetrackerapp.io` if you ever want to read it there.
- **No affiliate-side click tracking on the FE.** Until backend `/r/:code` exists, `clickCount` will always be 0 in the dashboard. Signups and conversions still increment normally via `?ref=` capture.
