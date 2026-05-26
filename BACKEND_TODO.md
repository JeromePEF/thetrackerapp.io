# Backend TODO - Required API Updates

Last Updated: May 21, 2026

---

## Priority: CRITICAL

### 1. Feature Flags (`/control` endpoint)

The `/control` endpoint controls all UI visibility.

**Architecture (edge-cached proxy):**

```
Browser ──▶ /api/control (Vercel serverless, 30-min CDN cache)
              └─▶ https://api.thetrackerapp.io/control (real backend)
```

- The frontend, edge middleware, and main.js all read from `/api/control` (same-origin).
- Vercel caches the response at the edge for **30 minutes** (`s-maxage=1800, stale-while-revalidate=300`).
- This means the backend at `api.thetrackerapp.io/control` is hit **at most ~once per Vercel region per 30 minutes**, regardless of how many visitors load the site.
- Backend changes take up to ~30 minutes to propagate to all users (acceptable tradeoff for massively reduced load).
- The proxy deep-merges upstream values over the frontend's FALLBACK_FLAGS, so any key the backend has not yet implemented (e.g. new `footer.*` toggles) still resolves to a sensible default.
- To force an immediate refresh, you can purge Vercel's cache for `/api/control` or wait up to 30 min.

**Backend `/control` response format:**

```json
{
  "blog": true,
  "press": true,
  "products": true,
  "brackets": false,
  "win": false,
  "runClubs": true,
  "personalTrainers": true,
  "pebbleApp": true,
  "macApps": true,
  "workoutResources": true,
  "pricing": true,
  "workoutGroups": true,
  "liveActivityFeed": true,
  "testimonials": true,
  "faq": true,
  "iphoneMockup": true,
  "stepTape": true,
  "bodyMeasurements": true,
  "multiMetricCharts": true,
  "narrative": true,
  "maintenanceMode": false,
  "maintenanceMessage": "We're upgrading our servers. Back soon!",
  "tools": {
    "tdeeCalculator": true,
    "bmiCalculator": true,
    "aiMealPlanner": true,
    "foodDiary": true
  },
  "footer": {
    "contact": true,
    "pricing": true,
    "community": true,
    "blog": true,
    "press": true,
    "guide": true,
    "status": true,
    "trust": true,
    "llmsTxt": true,
    "privacy": true,
    "terms": true,
    "home": true,
    "pebbleApp": true,
    "macApps": true,
    "freeTools": true,
    "groups": true,
    "workoutResources": true,
    "win": false,
    "products": true,
    "runClubs": true,
    "personalTrainers": true,
    "brackets": false
  },
  "socials": {
    "x":         "",
    "twitter":   "",
    "threads":   "",
    "instagram": "",
    "facebook":  "",
    "tiktok":    "",
    "snapchat":  "",
    "linkedin":  "",
    "bluesky":   "",
    "youtube":   "",
    "rumble":    "",
    "twitch":    "",
    "kick":      "",
    "bitchute":  "",
    "pinterest": "",
    "gbp":       "",
    "reddit":    "",
    "discord":   "",
    "telegram":  "",
    "mastodon":  "",
    "spotify":   "",
    "appleMusic":"",
    "podcast":   "",
    "medium":    "",
    "substack":  "",
    "patreon":   "",
    "kofi":      "",
    "github":    "",
    "website":   ""
  },
  "billing": {
    "monthlyTier": {
      "name": "Monthly",
      "price": 10,
      "interval": "month",
      "features": [
        "Unlimited workout, nutrition & water logging",
        "Body measurements & progress charts",
        "Leaderboards, brackets & streaks",
        "Wearable integrations",
        "Cancel anytime"
      ]
    },
    "yearlyTier": {
      "name": "Yearly",
      "price": 96,
      "interval": "year",
      "yearlyEquivalent": 8,
      "features": [
        "Everything in Monthly",
        "2 months free vs monthly",
        "Priority support",
        "Early access to new features"
      ]
    },
  }
}
```

The previous `freeTier`, `weeklyTier`, `proTier`, and `premiumTier` shapes
were removed when the pricing page was simplified to a single plan with two
billing intervals. Backends that still emit those keys will be ignored by the
frontend.

**Key flags:**
- `liveActivityFeed: false` hides the live activity feed and expands iPhone mockup
- `workoutGroups: false` hides "Join a Workout Group" button
- `maintenanceMode: true` shows maintenance overlay, blocks all site functionality
- `billing` object controls pricing page display (prices, features, tier names)
- `footer.*` toggles individual footer links across all pages (each is independent)
  - Frontend reads `data-feature="footer.contact"`, `data-feature="footer.privacy"`, etc.
  - Setting any `footer.<key>` to `false` hides that link on every page that renders it
  - Defaults: all `true` except `footer.win: false`, `footer.brackets: false` (matches page-level flags)
- `socials.*` is a key→URL map. Each non-empty URL produces a white SVG icon
  anchored to the bottom-right of every footer (see `src/footer-socials.js`).
  Supported keys (frontend ships icons for): `x`, `twitter`, `threads`,
  `instagram`, `facebook`, `tiktok`, `snapchat`, `linkedin`, `bluesky`,
  `youtube`, `rumble`, `twitch`, `kick`, `bitchute`, `pinterest`, `gbp`,
  `reddit`, `discord`, `telegram`, `mastodon`, `spotify`, `appleMusic`,
  `podcast`, `medium`, `substack`, `patreon`, `kofi`, `github`, `website`.
  Unknown keys are silently ignored. Set a key to `""` (or omit) to hide it.
- `dashboardTabs.*` controls which sidebar tabs render on the authenticated
  dashboard. Each flag mirrors a `<button data-feature="dashboardTabs.X">`
  in `dashboard.html`. Defaults:
  - `dashboardTabs.personalTrainer: true` — shows the PERSONAL TRAINER tab
    (renders the user's coach + their athletes + apply-to-be-a-coach card).
  - `dashboardTabs.groups: true` — shows GROUPS tab (iMessage/Telegram chats).
  - `dashboardTabs.runClubs: true` — shows RUN CLUBS tab.
  Setting any to `false` hides both the nav button and the panel.
- Public "become a coach" sign-up form lives at `/personal-trainers#apply`.
  Logged-out submissions POST to `/api/trainer/application/public` (admin
  review); logged-in submissions still POST to `/api/trainer/application`.
  Same body shape either way:
  ```json
  {
    "fullName": "...",
    "email":    "...",      // only present on the public form
    "city":     "...",      // only present on the public form
    "experienceYears": 10,
    "credentials": ["NSCA-CPT","RDN"],
    "specialties": ["Hybrid","Strength"],
    "bio": "...",
    "portfolioUrl": "https://...",
    "agreeTerms": true
  }
  ```
- `billing` only carries two tiers now: `monthlyTier` and `yearlyTier`. The
  yearly card auto-displays "$X/mo billed annually" computed from
  `yearlyTier.price / 12`; override with `yearlyTier.yearlyEquivalent`.
  Setting either tier to `null` (or omitting it) hides that card.

---

## Priority: HIGH

### 2. Workout Groups API

#### GET `/api/groups`
List available workout groups by platform.

**Response:**
```json
{
  "telegram": [
    {
      "id": "tg_123",
      "name": "Morning Lifters",
      "emoji": "🏋️",
      "members": 156,
      "description": "Early birds who lift before work. 5-7 AM crew.",
      "workoutsThisWeek": 342,
      "totalVolume": "1.2M lb",
      "topStreak": 45,
      "joinUrl": "https://t.me/morninglifters",
      "isPrivate": false,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "imessage": [
    {
      "id": "im_123",
      "name": "Austin Gym Bros",
      "emoji": "🤝",
      "members": 24,
      "description": "Local Austin lifters.",
      "workoutsThisWeek": 87,
      "totalVolume": "456K lb",
      "topStreak": 38,
      "joinUrl": "sms:+15551234567&body=Join",
      "isPrivate": false
    }
  ]
}
```

#### POST `/api/groups`
Create a new group. **Requires auth.**

**Request:**
```json
{
  "name": "My Gym Group",
  "platform": "telegram",
  "description": "Workout accountability group",
  "isPrivate": false
}
```

#### GET `/api/groups/:id`
Get group details with leaderboard.

#### POST `/api/groups/:id/join`
Join a group. **Requires auth.**

---

### 3. Dashboard Charts API

#### GET `/api/chart/data`  ← **Primary chart endpoint (used by frontend)**

The frontend Grafana-style chart panel in the dashboard now fetches everything
from this single endpoint. See `src/dashboard-charts.js` for the renderer.

**Query Params:**
| Param | Required | Description | Example |
|-------|----------|-------------|---------|
| `contact` | Yes | User identifier (iMessage handle, phone, telegram username) | `fierylion` |
| `range` | No | Time range preset (`7d`, `30d`, `90d`, `1y`, `all`). Default `all`. | `30d` |
| `from` | No | Custom start date (ISO) | `2025-01-01` |
| `to` | No | Custom end date (ISO) | `2026-05-22` |
| `metric` | No | Filter response to a single metric key | `weight` |

**Response shape:**
```json
{
  "ok": true,
  "contact": "fierylion",
  "range": "30d",
  "rangeStart": "2026-04-22",
  "rangeEnd": "2026-05-22",
  "generated": "2026-05-22T20:15:00.000Z",
  "metrics": [
    {
      "key": "weight",
      "label": "Weight",
      "unit": "lb",
      "category": "body",
      "available": true,
      "stats": {
        "min": 148.1,
        "max": 177,
        "avg": 162.5,
        "count": 36,
        "first": { "date": "2023-09-09", "value": 155 },
        "last":  { "date": "2026-05-21", "value": 177 },
        "delta": 22
      }
    }
  ],
  "metricsByCategory": {
    "nutrition":   [ /* MetricInfo[] */ ],
    "hydration":   [ /* ... */ ],
    "body":        [ /* ... */ ],
    "bodyMeasures":[ /* ... */ ],
    "health":      [ /* ... */ ]
  },
  "chartData": {
    "weight":   [ { "date": "2023-09-09", "value": 155 } ],
    "bicepL":   [ { "date": "2023-09-09", "value": 11.75 } ]
  }
}
```

**Metric keys the frontend uses:**

Nutrition: `calories, protein, carbs, fats, sugars, sodium, cholesterol, fiber, caffeine, creatine`
Hydration: `water, waterGallons`
Body: `weight, height, bodyFat`
Body measurements: `chest, shoulders, neck, biceps, bicepL, bicepR, forearms, forearmL, forearmR, waist, abs, hips, glutes, quads, quadL, quadR, calves, calfL, calfR`
Health (wearables): `steps, restingHR, activeCalories, sleepHours`

The frontend will silently ignore any metric whose `available` is `false` or
whose `chartData` array is empty.

The frontend renders the response as:
- A **Spotlight** strip with today's calorie ring, macros progress bars, logging streak and a 7-day calories bar chart
- A **Quick view** panel with Weight / Calories / Protein / Water mini-charts
- A "+ Show advanced charts" toggle that reveals:
  - An **Overlay chart** panel (compare any combination of metrics)
  - A **Symmetry Tracking** panel comparing left vs right for biceps, forearms, quads, calves
  - Per-category panels with one mini-chart per metric

**Optional fields the spotlight uses (degrades gracefully when absent):**

```json
{
  "goal": "Maintain",
  "streak": {
    "currentDays": 12,
    "longestDays": 47,
    "lastLog": "2026-05-22"
  },
  "targets": {
    "calories": 2400,
    "protein": 180,
    "carbs": 250,
    "fats": 70,
    "water": 100,
    "steps": 10000
  }
}
```

- `goal` – one of `Maintain` / `Lose` / `Gain` / `Recomp` / `Bulk` / `Cut`. Drives the small pill in the calorie card and the color of the macros bars. Defaults to `Maintain`.
- `streak.currentDays` – integer; how many consecutive days the user has logged anything. Shown next to a 🔥 emoji. Defaults to `0`.
- `targets.*` – per-metric daily goals used to draw the % progress ring and macro bars. If a target is missing the UI shows just the absolute number, no ring.

The frontend also de-duplicates the `waterGallons` metric (since `water` is the same series in different units).

#### GET `/api/user/charts` (legacy – may keep for compatibility)
Get chart data for all metrics. **Requires auth.**

**Query Params:**
- `from` (YYYY-MM-DD): Start date
- `to` (YYYY-MM-DD): End date
- `metrics` (comma-separated): Specific metrics to return

**Response:**
```json
{
  "weight": [{ "date": "2024-01-01", "value": 178 }],
  "calories": [{ "date": "2024-01-01", "value": 2100 }],
  "protein": [...],
  "carbs": [...],
  "fats": [...],
  "water": [...],
  "steps": [...],
  "restingHR": [...],
  "sugars": [...],
  "sodium": [...],
  "cholesterol": [...],
  "fiber": [...],
  "caffeine": [...],
  "supplements": {
    "creatine": [{ "date": "2024-01-01", "value": 5, "unit": "g" }],
    "tongkatAli": [...],
    "ashwagandha": [...],
    "vitaminD": [...],
    "omega3": [...],
    "magnesium": [...],
    "zinc": [...],
    "custom": [{ "date": "2024-01-01", "name": "Beta-Alanine", "value": 3.2, "unit": "g" }]
  }
}
```

**Note:** When user texts "took 5g creatine", populate `supplements.creatine`.

---

### 3b. Body Measurements & Journals (dashboard inline editing)

The dashboard `Body Measurements` panel lets the user click any value to edit it
in-place. Edits commit to the backend immediately on blur / Enter. The same
endpoints power the chart data above.

All endpoints **require auth** (`Authorization: Bearer <session>`).

#### GET `/api/user/measurements`
Return measurements + journals + summary used to hydrate the panel.

**Response:**
```json
{
  "goal": "Maintain",
  "weightDelta": -0.4,
  "goals": { "weight": 175, "bicepL": 16, "waist": 32 },
  "averages": { "weight": 178.2, "bicepL": 15.6 },
  "measurements": [
    {
      "date": "2026-05-22",
      "height": 70,
      "weight": 178.4,
      "bodyFat": 14.2,
      "chest": 42,
      "shoulders": 50,
      "bicepL": 15.7,
      "bicepR": 15.9,
      "forearmL": 12.5,
      "forearmR": 12.6,
      "neck": 16,
      "lats": 44,
      "traps": 18,
      "serratusAnterior": 11,
      "waist": 32,
      "abs": 32,
      "obliques": 33,
      "hips": 38,
      "glutes": 40,
      "quadL": 24,
      "quadR": 24,
      "calfL": 15,
      "calfR": 15
    }
  ],
  "journals": {
    "abs": { "content": "Lower abs visible under good light.", "date": "2026-05-20T18:04:00Z" },
    "arms": { "content": "...", "date": "..." },
    "back": { "content": "...", "date": "..." },
    "calves": { "content": "...", "date": "..." },
    "chest": { "content": "...", "date": "..." },
    "lats": { "content": "...", "date": "..." },
    "neck": { "content": "...", "date": "..." },
    "obliques": { "content": "...", "date": "..." },
    "quads": { "content": "...", "date": "..." },
    "serratusanterior": { "content": "...", "date": "..." },
    "shoulders": { "content": "...", "date": "..." },
    "traps": { "content": "...", "date": "..." }
  }
}
```

Notes:
- `measurements` is ordered newest-first. The dashboard always uses `measurements[0]` as the "current" row.
- Any field may be missing/null; the UI shows `--` for missing values.
- `journals` keys are lowercased body-part names with whitespace stripped (e.g. `Serratus Anterior` → `serratusanterior`). The frontend uses exactly these keys.

#### POST `/api/user/measurements`
Upsert a single measurement field for a specific date. Backend should locate
the existing row for `(user_id, date)` and merge the field into it (or insert
a new row if none exists). This is what the inline edit posts on every save.

**Request body:**
```json
{
  "date": "2026-05-22",
  "weight": 178.4
}
```

Or any subset of the keys from the `measurements[]` row above. Multiple keys
can be sent in one request when batching (the UI currently sends one field per
edit but the endpoint should accept any combination).

**Response:** the updated row.
```json
{
  "date": "2026-05-22",
  "weight": 178.4,
  "bicepL": 15.7
}
```

#### PATCH `/api/user/profile`
Update profile-level fields that do not belong to a per-day measurement row:
`height` (rarely changes), `goal`, unit system, etc.

**Request body (any subset):**
```json
{
  "height": 70,
  "goal": "Maintain"
}
```

Allowed `goal` values: `Maintain`, `Lose`, `Gain`, `Recomp`, `Bulk`, `Cut`.

**Response:** the updated profile.

#### POST `/api/user/journals/:part`
Upsert a qualitative assessment for a single body part. `:part` is the
lowercased key shown in the `journals` object above.

**Request body:**
```json
{ "content": "Lower abs visible under good light." }
```

**Response:**
```json
{
  "part": "abs",
  "content": "Lower abs visible under good light.",
  "date": "2026-05-22T17:15:00Z"
}
```

#### DELETE `/api/user/journals/:part`
Remove the journal entry for that body part. Returns 204 on success.

#### Body parts accepted by `/api/user/journals/:part`
`abs`, `arms`, `back`, `calves`, `chest`, `lats`, `neck`, `obliques`, `quads`,
`serratusanterior`, `shoulders`, `traps`.

#### Measurement field reference
The frontend may send any of the following keys to `POST /api/user/measurements`:
`height`, `weight`, `bodyFat`, `chest`, `shoulders`, `neck`, `lats`, `traps`,
`serratusAnterior`, `bicepL`, `bicepR`, `forearmL`, `forearmR`, `waist`, `abs`,
`obliques`, `hips`, `glutes`, `quadL`, `quadR`, `calfL`, `calfR`.

Units (frontend assumes US units by default; backend should store as sent and
respect the user's unit preference on read):
- `weight` — lb
- `height` — in
- `bodyFat` — %
- All circumference measurements — in

---

### 4. Testimonials API

#### GET `/api/testimonials`
Get testimonials for display (can be curated by admin).

**Response:**
```json
{
  "testimonials": [
    {
      "id": "test_123",
      "name": "Mike R.",
      "location": "Austin, TX",
      "platform": "iMessage",
      "rating": 5,
      "content": "I've tried every fitness app...",
      "stats": "Lost 23 lbs in 4 months",
      "avatar": "https://..."
    }
  ]
}
```

---

### 5. Live Activity Feed

#### GET `/api/activity/live` or WebSocket `/ws/activity`
Real-time activity stream for homepage.

**Response (polling) or WebSocket message:**
```json
{
  "events": [
    {
      "id": "evt_123",
      "userId": "user_abc",
      "name": "John D.",
      "location": "Austin, TX",
      "type": "steps",
      "icon": "👟",
      "delta": 150,
      "timestamp": "2024-01-15T14:30:00Z"
    }
  ],
  "stats": {
    "activeUsers": 42,
    "totalStepsToday": 125000,
    "totalMilesToday": 62.5,
    "totalWorkoutsToday": 89
  }
}
```

---

### 6. Pricing/Billing

#### GET `/api/billing/plans`
Get current pricing plans (mirrors `/control` billing object).

#### POST `/api/billing/subscribe`
Create subscription. **Requires auth.**

**Request:**
```json
{
  "planId": "pro",
  "interval": "monthly",
  "paymentMethodId": "pm_..."
}
```

---

## Priority: MEDIUM

### 7. Brackets/Competitions

#### GET `/api/brackets`
List active and upcoming brackets.

#### GET `/api/brackets/:id`
Get bracket details with matches.

**Response:**
```json
{
  "id": "bracket_123",
  "title": "Weekly Challenge",
  "type": "groups",
  "participants": 16,
  "round": "Quarter Finals",
  "prize": "$500",
  "matches": [
    {
      "id": 1,
      "round": 1,
      "team1": "Austin Runners",
      "team2": "NYC Fitness",
      "score1": 1250,
      "score2": 1180,
      "winner": 1
    }
  ]
}
```

---

### 8. Blog Posts

#### GET `/api/blog/posts`
List blog posts with pagination.

**Query Params:**
- `page` (int): Page number
- `limit` (int): Posts per page
- `tag` (string): Filter by tag

---

### 9. Products

#### GET `/api/products`
List affiliate products.

**Query Params:**
- `category` (string): Filter by category
- `brand` (string): Filter by brand

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  Homepage                                                        │
│  ├── /control → Feature flags, billing config                   │
│  ├── /api/activity/live → Live feed data                        │
│  └── /api/testimonials → Social proof                           │
│                                                                  │
│  Dashboard                                                       │
│  ├── /api/user/charts → All chart data + supplements            │
│  ├── /api/user/journals → Qualitative assessments               │
│  └── /api/user/body-metrics → Body measurements                 │
│                                                                  │
│  Groups Page                                                     │
│  └── /api/groups → Telegram & iMessage groups                   │
│                                                                  │
│  Brackets Page                                                   │
│  └── /api/brackets → Tournament data                            │
│                                                                  │
│  Pricing Page                                                    │
│  └── /control → billing object controls all pricing display     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Priority: HIGH - New Pages

### 10. Status Page API

#### GET `/api/status`
Get real-time system status for all services.

**Response:**
```json
{
  "overall": "operational",
  "services": [
    {
      "id": "website",
      "name": "Website",
      "status": "operational",
      "uptime": 99.98,
      "history": ["operational", "operational", ...] // 30 days
    },
    {
      "id": "api",
      "name": "Tracker API",
      "status": "operational",
      "uptime": 99.95,
      "history": [...]
    },
    {
      "id": "dashboard",
      "name": "Dashboard",
      "status": "operational",
      "uptime": 99.99,
      "history": [...]
    },
    {
      "id": "telegram",
      "name": "Telegram Bot",
      "status": "operational",
      "uptime": 99.90,
      "history": [...]
    },
    {
      "id": "imessage",
      "name": "iMessage Service",
      "status": "operational",
      "uptime": 99.85,
      "history": [...]
    },
    {
      "id": "sms",
      "name": "SMS Service",
      "status": "operational",
      "uptime": 99.92,
      "history": [...]
    }
  ],
  "stats": {
    "avgResponseTime": 185,
    "p95ResponseTime": 420,
    "requestsToday": 78500
  },
  "incidents": [
    {
      "id": "inc_123",
      "title": "Brief API latency spike",
      "date": "2026-05-15T10:30:00Z",
      "status": "resolved"
    }
  ]
}
```

**Status values:** `operational`, `degraded`, `outage`

---

### 11. Trust Center Data

The trust center page is mostly static but may need:

#### GET `/api/compliance`
Get current compliance certifications and status.

**Response:**
```json
{
  "certifications": [
    {
      "name": "SOC 2 Type II",
      "status": "certified",
      "lastAudit": "2026-03-15",
      "nextAudit": "2027-03-15"
    },
    {
      "name": "10DLC/A2P",
      "status": "verified",
      "verifiedDate": "2025-08-20"
    }
  ],
  "encryption": {
    "atRest": "AES-256",
    "inTransit": "TLS 1.3"
  },
  "gdprCompliant": true
}
```

---

## Data Flow Summary (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  Homepage                                                        │
│  ├── /control → Feature flags, billing config                   │
│  ├── /api/activity/live → Live feed data                        │
│  └── /api/testimonials → Social proof                           │
│                                                                  │
│  Dashboard                                                       │
│  ├── /api/user/charts → All chart data + supplements            │
│  ├── /api/user/journals → Qualitative assessments               │
│  └── /api/user/body-metrics → Body measurements                 │
│                                                                  │
│  Groups Page                                                     │
│  └── /api/groups → Telegram & iMessage groups                   │
│                                                                  │
│  Brackets Page                                                   │
│  └── /api/brackets → Tournament data                            │
│                                                                  │
│  Pricing Page                                                    │
│  └── /control → billing object controls all pricing display     │
│                                                                  │
│  Status Page                                                     │
│  └── /api/status → Real-time service status and uptime          │
│                                                                  │
│  Trust Center                                                    │
│  └── /api/compliance → Certification status (optional)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notes

- All authenticated endpoints use `Authorization: Bearer <session_token>`
- Admin endpoints require separate admin token
- Feature flags cached client-side for 5 minutes
- When `maintenanceMode: true`, site shows overlay and blocks all forms
- Pricing is fully dynamic - change prices in `/control` billing object
- Status page polls `/api/status` every 60 seconds
- llms.txt served as static file from `/public/llms.txt`
