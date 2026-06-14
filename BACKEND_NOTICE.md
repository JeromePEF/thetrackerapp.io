# Backend Notice — User Profile Page Requirements

Last updated: After frontend heatmap redesign (52-week grid)

---

## What the frontend needs from GET /api/u/:username

### 1. `heatmap.days[]` — MUST be ~365 entries (52+ weeks)

The heatmap now renders a full GitHub-style contribution grid:
- 7 rows (Sun–Sat)
- 52–53 columns (weeks)
- Month labels at top (Jul, Aug, Sep, ...)
- Day-of-week labels on left (Sun, Mon, ...)
- Hover tooltip shows: "Monday, June 14, 2024: 2 workouts"

**Previously was 84 days (12 weeks) — now needs a full year.**

Each entry:
```json
{ "date": "2024-06-14", "workouts": 2, "nutrition": 3, "water": 0.75 }
```

| Field | Type | Notes |
|---|---|---|
| `date` | `"YYYY-MM-DD"` | Required. No time component. |
| `workouts` | number | Count of workouts logged that day |
| `nutrition` | number | Count of nutrition entries logged that day |
| `water` | number | Gallons (oz ÷ 128, 2 decimals) |

### 2. Colors per category

| Category | Color | Hex |
|---|---|---|
| Workouts | Blue | `rgba(72,147,255,...)` |
| Nutrition | Green | `rgba(70,210,120,...)` |
| Hydration | Tan/Amber | `rgba(210,160,90,...)` |

### 3. Intensity levels

**Workouts & Nutrition** (count-based):
- 0 = empty
- 1 = 1 entry
- 2 = 2 entries
- 3 = 3 entries
- 4 = 4+ entries

**Hydration** (gallons-based):
- 0 = 0 gal
- 1 = 0.01–0.25 gal
- 2 = 0.26–0.50 gal
- 3 = 0.51–1.0 gal
- 4 = 1.0+ gal

### 4. `leaderboard` section

```json
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
}
```

Each `strength`/`calisthenics` entry needs: `exercise` (string), `rank` (number), `value` (number), `unit` (string).

Omit a section (e.g. `strength: null`) to hide that card. Empty array shows "No standings yet."

### 5. `recentWorkouts[]`

```json
"recentWorkouts": [
  { "date": "2024-06-14", "exercise": "Bench Press", "sets": 3, "reps": 10, "weight": 225, "unit": "lb" }
]
```

Supports these field names: `exercise`/`name`/`label`, `sets`, `reps`, `weight`, `unit`, `date`/`loggedAt`/`createdAt`, `detail`/`notes`. Max 10 shown.

### 6. `publicVisibility` — 5 toggles now

```json
"publicVisibility": {
  "workouts": true,
  "nutrition": true,
  "water": true,
  "leaderboard": true,
  "recentWorkouts": true
}
```

All default to `true`. POST `/api/user/visibility` or PATCH `/api/user/profile` to update.

### 7. Existing fields unchanged

| Field | Required |
|---|---|
| `profile.displayName` | Yes |
| `profile.joinedAt` | Yes |
| `stats.totalWorkouts` | Yes |
| `stats.currentStreak` | Yes |
| `stats.activeDays` | Yes |
| `username` | Yes |

---

## Testing users

- `https://thetrackerapp.io/@FieryLion` — all toggles on (default state)
- `https://thetrackerapp.io/@ExhaustiveTester` — will test toggles by turning sections off
