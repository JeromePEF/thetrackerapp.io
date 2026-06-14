# Backend User Profile — Reference Spec (for frontend handoff)

These endpoints are implemented. This doc is the canonical frontend-facing reference.

---

## 1. Public Profile Data

### `GET /api/u/:username`

Auth: None. CORS: `*`. Public.

**Response:**

```json
{
  "ok": true,
  "username": "rd",

  "profile": {
    "displayName": "RD",
    "joinedAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z"
  },

  "stats": {
    "totalWorkouts": 142,
    "currentStreak": 7,
    "activeDays": 89
  },

  "heatmap": {
    "days": [
      { "date": "2024-06-14", "workouts": 2, "nutrition": 3, "water": 0.75 },
      { "date": "2024-06-13", "workouts": 1, "nutrition": 2, "water": 0.50 },
      { "date": "2024-06-12", "workouts": 0, "nutrition": 0, "water": 0.00 }
    ],
    "dateRange": {
      "from": "2024-03-22",
      "to": "2024-06-14"
    }
  },

  "history": {
    "workouts": [
      { "date": "2024-06-13T08:30:00Z" },
      { "date": "2024-06-12T07:45:00Z" }
    ],
    "nutrition": [
      { "date": "2024-06-13T12:00:00Z", "calories": 2100 },
      { "date": "2024-06-12T11:30:00Z", "calories": 1850 }
    ],
    "water": [
      { "date": "2024-06-13T14:00:00Z", "gallons": 0.5 },
      { "date": "2024-06-12T15:00:00Z", "gallons": 0.75 }
    ]
  },

  "publicVisibility": {
    "workouts": true,
    "nutrition": true,
    "water": true,
    "leaderboard": true,
    "recentWorkouts": true
  },

  "leaderboard": {
    "strength": [
      { "exercise": "BENCH", "rank": 1, "value": 999, "unit": "lb" },
      { "exercise": "SQUAT", "rank": 1, "value": 225, "unit": "lb" },
      { "exercise": "DEADLIFT", "rank": 1, "value": 135, "unit": "lb" }
    ],
    "calisthenics": [
      { "exercise": "PUSHUPS", "rank": 1, "value": 254, "unit": "reps" },
      { "exercise": "PULLUPS", "rank": 1, "value": 105, "unit": "reps" },
      { "exercise": "SQUATS", "rank": 1, "value": 91, "unit": "reps" },
      { "exercise": "DIPS", "rank": 1, "value": 90, "unit": "reps" }
    ],
    "streaks": {
      "rank": 1,
      "days": 5,
      "summary": "ExhaustiveTester just logged 5 days in a row!"
    }
  },

  "recentWorkouts": [
    { "date": "2024-06-14", "exercise": "Bench Press", "sets": 3, "reps": 10, "weight": 225, "unit": "lb" }
  ]
}```

**Key fields:**

| Field | Notes |
|---|---|
| `heatmap.days[]` | 84 contiguous days (12 weeks x 7). Zero-filled for days with no activity. Primary render source. |
| `heatmap.days[].date` | ISO date `"YYYY-MM-DD"` (no time component). |
| `heatmap.days[].workouts` | Count of workout entries logged that day. |
| `heatmap.days[].nutrition` | Count of nutrition entries logged that day. |
| `heatmap.days[].water` | Total water in gallons (oz / 128, rounded to 2 decimals). |
| `stats.totalWorkouts` | All-time workout count. |
| `stats.activeDays` | Distinct calendar days with >= 1 workout, all-time. |
| `stats.currentStreak` | Consecutive days (including today) with any workout activity. |
| `leaderboard.strength[]` | Strength PRs: `{ exercise, rank, value, unit }`. Rendered as medal + label + value. |
| `leaderboard.calisthenics[]` | Calisthenics PRs: same shape as strength. |
| `leaderboard.streaks` | Streak standings: `{ rank, days, summary }`. Summary shown below the row. |
| `recentWorkouts[]` | Most recent 10 workouts: `{ date, exercise, sets, reps, weight, unit }`. Also accepts `name`, `label`, `detail`, `notes`, `loggedAt`, `createdAt`. |

**Heatmap rendering:**

| Category | Color | Intensity scale |
|---|---|---|
| Workouts | Blue (`rgba(72,147,255,...)`) | 0=empty, 1=1, 2=2, 3=3+ |
| Nutrition | Green (`rgba(70,210,120,...)`) | 0=empty, 1=1, 2=2, 3=3+ |
| Water | Purple (`rgba(160,110,235,...)`) | 0=0 gal, 1=>0-0.25, 2=>0.25-0.5, 3=>0.5-1, 4=>1+ gal |

**Error codes:**

| Code | Body |
|---|---|
| 404 | `{ "ok": false, "error": "User not found" }` |
| 400 | `{ "ok": false, "error": "Username required" }` |

---

## 2. Toggle Visibility (Dashboard Settings)

### `POST /api/user/visibility`

Auth: Required (Bearer token).

**Request:**
```json
{
  "visibility": {
    "workouts": true,
    "nutrition": false,
    "water": true,
    "leaderboard": true,
    "recentWorkouts": true
  }
}
```

**Response:**
```json
{
  "ok": true,
  "visibility": {
    "workouts": true,
    "nutrition": false,
    "water": true,
    "leaderboard": true,
    "recentWorkouts": true
  }
}
```

- Partial updates supported — omit keys to leave them unchanged.
- Defaults: all five `true` if never set.
- Backend always returns ALL data in `GET /api/u/:username`. Visibility is a frontend display toggle only.

---

## 3. Visibility in Existing Endpoints

These endpoints now include a `publicVisibility` object in their response:

- `GET /api/user/profile` (also `/api/portal`, `/api/account/profile`)
- `GET /api/user/charts`
- `PATCH /api/user/profile`

The dashboard hydrates visibility toggles from these on page load — no separate GET needed.

---

## 4. URL Scheme

| Context | URL |
|---|---|
| Main site | `https://thetrackerapp.io/@rd` |
| Shortlink (future) | `https://tta.link/rd` |

The `@` prefix on the main site avoids route collisions with `/login`, `/dashboard`, `/pricing`, `/blog`, etc. On a dedicated shortlink domain there are no conflicts.

---

## 5. Loading States (Frontend)

| State | Behavior |
|---|---|
| Fetching | Skeleton grid: 84 pulsing empty cells |
| 200 with empty `heatmap.days` | Profile header with 0 stats, "No activity data" on each card |
| 404 | "User not found" card with back-to-home link |
| Network error | Generic error message with console.warn |

## 6. Testing users

The first live user profiles:

- `https://thetrackerapp.io/@FieryLion`
- `https://thetrackerapp.io/@ExhaustiveTester`
