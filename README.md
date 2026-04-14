# FitTrack Frontend

Premium, messaging-first web app frontend for FitTrack.

## What this build includes

- Landing page with feature highlights and subscription plans
- Onboarding flow with provider-aware identity capture and plan checkout state
- Login form for phone/email identity workflows
- Member dashboard with today/week/month workout summaries
- Workout history reporting by exercise with progressive overload suggestions
- Tutorial mode command gallery
- Billing management with plan switching and cancel flow
- Export center for workout CSV, nutrition CSV, full text, and JSON

## API wiring

The onboarding and hero welcome forms call:

- `POST https://api.thetrackerapp.io/api/welcome`

Payload format is provider-aware:

- iMessage: `{ "contact": "7373686293", "provider": "iMessage" }`
- Email: `{ "email": "user@example.com", "provider": "Email" }`
- Telegram/Discord: `{ "username": "fittrack_user_demo", "provider": "Telegram" }`

## Local development

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Analytics

### Vercel Web Analytics

Vercel analytics is wired with `@vercel/analytics` and `inject()` in:

- `src/main.js`
- `src/directory-page.js`
- `src/workout-resources.js`

### Google Analytics (GA4)

Set a GA4 measurement ID as `VITE_GA_MEASUREMENT_ID`:

```bash
cp .env.example .env
# edit .env and set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Then deploy. If the env var is set, the app auto-loads `gtag.js` and sends pageviews.

## Static preview fallback

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Files

- `index.html`: app structure and sections
- `styles.css`: responsive visual system and component styling
- `src/data.js`: plans, commands, and seeded demo data
- `src/api.js`: API client and identity validation helpers
- `src/components.js`: rendering + summary/report builders
- `src/main.js`: state orchestration, events, and exports
