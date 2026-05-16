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

### GA4 multi-site management (programmatic)

This repo includes a provisioning script for multiple domains:
It uses in-script defaults for account/sites/credentials, so no `.env` is required for this script.

```bash
npm run ga4:sites
npm run ga4:sites -- --list-accounts
npm run ga4:sites -- --account 262650966 --site "TheTrackerApp|https://thetrackerapp.io"
npm run ga4:sites -- --account 262650966 --sites-file ./ga4-sites.example.json
```

Use `--apply` to actually create missing properties/streams (default is dry-run):

```bash
npm run ga4:sites -- --account 262650966 --sites-file ./sites.json --apply
npm run ga4:sites -- --account 262650966 --sites-file ./sites.json --strict-property-per-site --apply
```

The script will:
- reuse an existing web stream when domain matches
- optionally enforce one property per site with `--strict-property-per-site`
- create missing property/stream when `--apply` is passed
- print measurement IDs (`G-...`) and env var suggestions

## Comprehensive Google Metrics Script (GA4 + AdSense + Google Ads)

This repo includes a script that pulls a broad metrics snapshot from:

- GA4 Data API (users, sessions, pages, channels, devices, countries)
- AdSense Management API (earnings, impressions, clicks, RPM, daily and breakdowns)
- Google Ads API (summary, daily trend, campaigns, devices, keywords)

### 1. Configure credentials

```bash
cp .env.google-metrics.example .env.google-metrics
# fill values in .env.google-metrics
```

For GA4 + AdSense via Application Default Credentials (ADC):

```bash
gcloud auth application-default login
```

For Google Ads, set at minimum:

- `GOOGLE_ADS_CUSTOMER_ID`
- `GOOGLE_ADS_DEVELOPER_TOKEN`

You can use ADC or provide refresh-token credentials:

- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`

### 2. Run the script

```bash
npm run metrics:google -- --days 30
```

Optional:

- `--out /absolute/path/file.json`
- `--no-ga4`
- `--no-adsense`
- `--no-google-ads`

The script writes JSON output to `metrics/google-metrics-<timestamp>.json` by default.

### Gemini cost breakdown (Flash vs non-Flash)

For exact spend split from your Google Cloud billing data, use the billing export script:

```bash
npm run billing:gemini -- --table your-project.your_dataset.your_billing_export_table --days 30
```

If `--table` / `GCP_BILLING_EXPORT_TABLE` is not set, the script attempts auto-discovery
in your active query project by scanning for tables named like `gcp_billing_export_v1_*`.

This script queries your Cloud Billing export table in BigQuery and returns:

- Gemini total spend
- Flash vs non-Flash spend
- Model bucket split (Flash / Pro / other Gemini)
- SKU-level costs (top Gemini SKUs)
- Daily Gemini trend
- Top services/projects across all cloud spend

If you prefer env vars instead of `--table`, set:

- `GCP_BILLING_EXPORT_TABLE`
- optional `GCP_BILLING_QUERY_PROJECT`

### Billing monitoring (health + spend + budget guardrail)

Programmatic monitoring commands:

```bash
npm run billing:monitor
npm run billing:overview
npm run billing:monitor -- --daily-alert-usd 15 --mtd-alert-usd 250 --fail-on-alert
npm run billing:budget
npm run billing:budget -- --create --monthly-usd 300 --display-name "Truist Cost Guard"
```

Reference setup file:

- `BILLING_MONITOR_SETUP.txt`

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
