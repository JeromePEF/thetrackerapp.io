# Backend API Endpoints Required

This document lists all API endpoints needed from `api.thetrackerapp.io` for the frontend features.

---

## Feature Control (Admin)

### GET `/control`
Returns feature flags for frontend visibility control.

**Response:**
```json
{
  "blog": true,
  "press": true,
  "products": true,
  "brackets": false,
  "win": false,
  "runClubs": true,
  "personalTrainers": true,
  "testimonials": true,
  "faq": true,
  "iphoneMockup": true,
  "stepTape": true,
  "bodyMeasurements": true,
  "multiMetricCharts": true,
  "narrative": true,
  "tools": {
    "tdeeCalculator": true,
    "bmiCalculator": true,
    "aiMealPlanner": true,
    "foodDiary": true
  }
}
```

### POST `/control`
Updates feature flags. **Requires admin auth.**

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "brackets": true,
  "win": true
}
```

---

## Blog

### GET `/api/blog/posts`
List blog posts with pagination and filtering.

**Query Params:**
- `page` (int): Page number, default 1
- `limit` (int): Posts per page, default 12
- `tag` (string): Filter by tag
- `search` (string): Search query

**Response:**
```json
{
  "posts": [
    {
      "id": "post_123",
      "slug": "how-to-track-calories",
      "title": "How to Track Calories via SMS",
      "excerpt": "Learn the simple commands...",
      "content": "Full markdown content...",
      "featuredImage": "https://...",
      "author": "Tracker Team",
      "publishedAt": "2024-01-15T10:00:00Z",
      "tags": ["tips", "calories", "tracking"]
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "tags": ["tips", "calories", "tracking", "workouts"]
}
```

### POST `/api/blog/posts`
Create a new blog post. **Requires admin auth.**

**Headers:** `Authorization: Bearer <session_token>`

**Request Body:**
```json
{
  "title": "Post Title",
  "slug": "post-title",
  "excerpt": "Brief summary",
  "content": "Markdown content...",
  "tags": ["tag1", "tag2"],
  "featuredImage": "https://..."
}
```

### GET `/api/blog/posts/:slug`
Get single blog post by slug.

---

## Press

### POST `/api/press/inquiry`
Submit a press inquiry.

**Request Body:**
```json
{
  "email": "reporter@media.com",
  "subject": "Interview Request",
  "outlet": "TechCrunch",
  "deadline": "2024-02-01",
  "message": "We'd like to interview..."
}
```

### GET `/api/press/releases`
List press releases.

**Query Params:**
- `limit` (int): Number to return, default 5

**Response:**
```json
{
  "releases": [
    {
      "id": "pr_123",
      "title": "The Tracker App Launches...",
      "date": "2024-01-10T10:00:00Z",
      "url": "https://..."
    }
  ]
}
```

---

## Brackets / Competitions

### GET `/api/brackets/active`
Get active/live brackets.

**Response:**
```json
{
  "brackets": [
    {
      "id": "bracket_123",
      "name": "January Fitness Challenge",
      "type": "open",
      "participants": 64,
      "progress": 75,
      "prize": 500,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    }
  ]
}
```

### GET `/api/brackets/upcoming`
Get upcoming brackets.

### GET `/api/brackets/:id`
Get full bracket details including rounds and matches.

**Response:**
```json
{
  "id": "bracket_123",
  "name": "January Fitness Challenge",
  "participants": 64,
  "roundsRemaining": 2,
  "prize": 500,
  "rounds": [
    {
      "name": "Quarter Finals",
      "matches": [
        {
          "participant1": { "id": "user_1", "name": "Mike R." },
          "participant2": { "id": "user_2", "name": "Sarah K." },
          "score1": 450,
          "score2": 380,
          "winner": "user_1"
        }
      ]
    }
  ]
}
```

### GET `/api/brackets/winners`
Get past bracket winners.

**Query Params:**
- `limit` (int): Number to return

**Response:**
```json
{
  "winners": [
    {
      "name": "Mike R.",
      "competition": "December Challenge",
      "date": "2023-12-31T23:59:59Z"
    }
  ]
}
```

---

## Win $$$ Challenges

### GET `/api/challenges/current`
Get currently active challenge (or 404 if none).

**Response:**
```json
{
  "id": "challenge_123",
  "title": "100 Burpee Blitz",
  "description": "Complete 100 burpees as fast as possible!",
  "requirements": [
    { "label": "Burpees", "value": 100 }
  ],
  "prize": 50,
  "endsAt": "2024-01-15T18:00:00Z"
}
```

### GET `/api/challenges/:id/leaderboard`
Get challenge leaderboard.

**Response:**
```json
{
  "entries": [
    {
      "username": "Mike R.",
      "progress": 100,
      "completedAt": "2024-01-15T17:32:00Z"
    },
    {
      "username": "Sarah K.",
      "progress": 85,
      "completedAt": null
    }
  ]
}
```

### GET `/api/challenges/winners`
Get past challenge winners.

**Query Params:**
- `limit` (int): Number to return

**Response:**
```json
{
  "winners": [
    {
      "username": "Mike R.",
      "challenge": "100 Burpee Blitz",
      "prize": 50,
      "date": "2024-01-14T00:00:00Z"
    }
  ]
}
```

---

## Step Tape (Live Steps)

### GET `/api/steps/live`
Get current step tape data.

**Response:**
```json
{
  "totalSteps": 12456789,
  "totalMiles": 5923.4,
  "recentActivity": [
    {
      "username": "pebble_user",
      "steps": 523,
      "source": "Pebble",
      "timestamp": "2024-01-15T17:30:00Z"
    }
  ]
}
```

### GET `/api/steps/live/recent`
Get most recent step activity (for polling).

**Response:**
```json
{
  "activity": [
    {
      "username": "pebble_user",
      "steps": 234,
      "source": "Fitbit",
      "timestamp": "2024-01-15T17:35:00Z"
    }
  ],
  "totalSteps": 12457023,
  "totalMiles": 5923.5
}
```

---

## Body Measurements & Charts

### GET `/api/user/measurements`
Get user's body measurements. **Requires auth.**

**Headers:** `Authorization: Bearer <session_token>`

**Response:**
```json
{
  "measurements": [
    {
      "date": "2024-01-15T10:00:00Z",
      "weight": 175.5,
      "bodyFat": 15.2,
      "height": 70,
      "chest": 42,
      "bicepL": 15.5,
      "bicepR": 15.7,
      "waist": 32,
      "abs": 33,
      "quadL": 24,
      "quadR": 24.2
    }
  ],
  "goals": {
    "weight": 170,
    "bicepL": 16,
    "bicepR": 16
  },
  "averages": {
    "weight": 176.2,
    "bicepL": 15.3
  },
  "weightDelta": -1.5,
  "goal": "Lose"
}
```

### POST `/api/user/measurements`
Log new body measurements. **Requires auth.**

**Request Body:**
```json
{
  "date": "2024-01-15T10:00:00Z",
  "weight": 175.0,
  "chest": 42.5,
  "bicepL": 15.6,
  "bicepR": 15.8
}
```

### GET `/api/user/charts`
Get chart data for all metrics. **Requires auth.**

**Response:**
```json
{
  "weight": [
    { "date": "2024-01-01", "value": 178 },
    { "date": "2024-01-08", "value": 177 },
    { "date": "2024-01-15", "value": 175.5 }
  ],
  "calories": [
    { "date": "2024-01-01", "value": 2100 },
    { "date": "2024-01-02", "value": 1950 }
  ],
  "protein": [...],
  "carbs": [...],
  "fats": [...],
  "water": [...],
  "steps": [...],
  "restingHR": [...],
  "creatine": [...],
  "sugars": [...],
  "sodium": [...],
  "cholesterol": [...],
  "vitamins": [...],
  "minerals": [...],
  "tongkatAli": [...],
  "otherSupps": [...]
}
```

---

## Narrative Journals

### GET `/api/user/journals`
Get user's qualitative assessments. **Requires auth.**

**Response:**
```json
{
  "journals": {
    "abs": {
      "content": "Have definition but can be more aesthetic...",
      "date": "2024-01-10T15:00:00Z"
    },
    "arms": {
      "content": "Not much of a peak on bicep...",
      "date": "2024-01-10T15:00:00Z"
    }
  }
}
```

### POST `/api/user/journals/:bodyPart`
Save/update journal entry for a body part. **Requires auth.**

**Request Body:**
```json
{
  "content": "Seeing more definition in lower abs..."
}
```

---

## AI Meal Planner

### POST `/api/tools/meal-planner`
Generate AI meal plan.

**Request Body:**
```json
{
  "calories": 2000,
  "protein": 150,
  "goal": "lose",
  "mealsPerDay": "4",
  "diet": ["gluten-free"],
  "exclude": "shellfish, peanuts"
}
```

**Response:**
```json
{
  "days": [
    {
      "day": 1,
      "dayName": "Monday",
      "meals": [
        {
          "type": "Breakfast",
          "name": "Protein Oatmeal",
          "foods": "Oats, protein powder, banana, almond butter",
          "calories": 480,
          "protein": 35,
          "carbs": 55,
          "fat": 14
        }
      ]
    }
  ],
  "totals": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 67
  }
}
```

---

## User Role Check

### GET `/api/user/role`
Get current user's role. **Requires auth.**

**Response:**
```json
{
  "role": "admin" | "user" | "premium"
}
```

---

## Testimonials

### GET `/api/testimonials`
Get testimonials for display.

**Query Params:**
- `limit` (int): Number to return, default 10

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

## Products (Affiliate Links)

### GET `/api/products`
Get product listings.

**Query Params:**
- `category` (string): Filter by category
- `brand` (string): Filter by brand

**Response:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "name": "Pebble Time Steel",
      "description": "Classic e-paper smartwatch...",
      "category": "smartwatch",
      "brand": "pebble",
      "price": "From $49",
      "image": "https://...",
      "features": ["Steps", "Sleep", "Workouts"],
      "affiliateUrl": "https://...",
      "recommended": true
    }
  ]
}
```

---

## Wearable Integrations (for Step Tape)

### POST `/api/integrations/sync`
Sync data from wearable devices.

**Request Body:**
```json
{
  "source": "oura" | "garmin" | "whoop" | "fitbit" | "pebble",
  "data": {
    "steps": 5234,
    "heartRate": 72,
    "sleep": {
      "total": 7.5,
      "deep": 1.5,
      "rem": 2.0
    }
  }
}
```

---

## Summary of All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/control` | No | Feature flags |
| POST | `/control` | Admin | Update feature flags |
| GET | `/api/blog/posts` | No | List blog posts |
| POST | `/api/blog/posts` | Admin | Create blog post |
| GET | `/api/blog/posts/:slug` | No | Get single post |
| POST | `/api/press/inquiry` | No | Submit press inquiry |
| GET | `/api/press/releases` | No | List press releases |
| GET | `/api/brackets/active` | No | Active brackets |
| GET | `/api/brackets/upcoming` | No | Upcoming brackets |
| GET | `/api/brackets/:id` | No | Bracket details |
| GET | `/api/brackets/winners` | No | Past winners |
| GET | `/api/challenges/current` | No | Current challenge |
| GET | `/api/challenges/:id/leaderboard` | No | Challenge leaderboard |
| GET | `/api/challenges/winners` | No | Past challenge winners |
| GET | `/api/steps/live` | No | Live step data |
| GET | `/api/steps/live/recent` | No | Recent step activity |
| GET | `/api/user/measurements` | User | Body measurements |
| POST | `/api/user/measurements` | User | Log measurements |
| GET | `/api/user/charts` | User | Chart data |
| GET | `/api/user/journals` | User | Journal entries |
| POST | `/api/user/journals/:part` | User | Save journal entry |
| POST | `/api/tools/meal-planner` | No | Generate meal plan |
| GET | `/api/user/role` | User | Get user role |
| GET | `/api/testimonials` | No | Get testimonials |
| GET | `/api/products` | No | Get products |
| POST | `/api/integrations/sync` | User | Sync wearable data |
