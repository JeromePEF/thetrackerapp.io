# Backend Requirements — Public User Profiles

These are the new API endpoints needed to power public user profile pages
at `thetrackerapp.io/@<username>`.

---

## 1. Public Profile Data

### `GET /api/u/:username`

**Auth:** None (public endpoint, CORS: `*`)

Returns a user's public profile data and activity history for rendering
the heatmap grid.

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
    "water": true
  }
}
```

**Behavior:**

- If the user doesn't exist → `404` with `{ "ok": false, "error": "User not found" }`
- If the user exists but has no public data → return the profile with empty
  history arrays
- History entries must have a `date` field (ISO 8601 string or Date-parsable).
  The frontend also checks `loggedAt`, `createdAt`, `timestamp`, `recordedAt`.
- Return at least the last 84 days of history (12 weeks × 7 days) per category
  to fill the heatmap grid.
- Respect `publicVisibility` — if `workouts: false`, the frontend hides that
  card; the backend should still return the data (the visibility toggle is a
  frontend display concern that the user controls from their dashboard).

---

## 2. Public Profile Visibility Settings

### `POST /api/user/visibility`

**Auth:** Required (Bearer token)

Lets a logged-in user toggle which sections appear on their public profile.

**Request Body:**

```json
{
  "visibility": {
    "workouts": true,
    "nutrition": false,
    "water": true
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
    "water": true
  }
}
```

**Behavior:**

- The visibility object is stored per-user and returned in `GET /api/u/:username`
  under `publicVisibility`.
- Default all to `true` if never set.
- This is purely a display toggle — the backend still serves the underlying
  history data on `GET /api/u/:username` regardless of visibility settings.

---

## 3. Frontend URL Scheme

| Context | URL |
|---|---|
| Main site profile page | `https://thetrackerapp.io/@rd` |
| Future shortlink domain | `https://tta.link/rd` |

The `@` prefix on the main site avoids collisions with existing routes
(`/login`, `/dashboard`, `/pricing`, `/blog`, etc.). On a dedicated shortlink
domain there are no route conflicts, so `tta.link/rd` works directly.

## 4. Existing Endpoints to Update

If the user's profile data isn't already available through existing endpoints,
add `publicVisibility` to the response of:

- `GET /api/user/profile`
- `GET /api/user/charts`
- `PATCH /api/user/profile`

This lets the dashboard hydrate the visibility toggles on page load without a
separate request.
