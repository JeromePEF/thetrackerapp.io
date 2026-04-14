const dayMs = 24 * 60 * 60 * 1000;

function isoDaysAgo(daysAgo) {
  const date = new Date(Date.now() - daysAgo * dayMs);
  return date.toISOString();
}

function weighted(exercise, sets, daysAgo, category) {
  return {
    id: `${exercise}-${daysAgo}-weighted`,
    exercise,
    category,
    type: "weighted",
    sets,
    date: isoDaysAgo(daysAgo),
  };
}

function count(exercise, reps, daysAgo, category) {
  return {
    id: `${exercise}-${daysAgo}-count`,
    exercise,
    category,
    type: "count",
    reps,
    date: isoDaysAgo(daysAgo),
  };
}

function timed(exercise, seconds, daysAgo, category) {
  return {
    id: `${exercise}-${daysAgo}-timed`,
    exercise,
    category,
    type: "timed",
    seconds,
    date: isoDaysAgo(daysAgo),
  };
}

export const plans = [
  {
    id: "workout",
    name: "Workout",
    price: 10,
    description: "Workout logs, history, and progressive overload reports.",
  },
  {
    id: "nutrition",
    name: "Nutrition",
    price: 10,
    description: "Nutrition tracking, macro snapshots, and hydration summaries.",
  },
  {
    id: "combo",
    name: "Combo",
    price: 20,
    description: "Workout + Nutrition in one plan with weekly reviews.",
  },
  {
    id: "premium",
    name: "Premium",
    price: 25,
    description: "All features plus AI coaching and plan assessment guidance.",
  },
];

export const featureHighlights = [
  "Text-based workout logging from iMessage or provider chat",
  "Nutrition and water tracking from short commands",
  "Workout history with progressive overload suggestions",
  "Tutorial mode with command examples and quick help",
  "CSV, text, JSON, and Google Sheets export support",
  "Weekly and monthly summaries with subscription-aware dashboard",
];

export const commandGuide = [
  { cmd: "/log bench press 4,8,225", description: "Log weighted sets: set count, reps, and load." },
  { cmd: "/log plank 60s", description: "Log timed sets for core or conditioning drills." },
  { cmd: "/pushups 25", description: "Quick count log for bodyweight movements." },
  { cmd: "/report bench press", description: "Get an exercise-specific history report." },
  { cmd: "/suggest", description: "Request automatic training-volume suggestions." },
  { cmd: "/water 20", description: "Log hydration in ounces." },
  { cmd: "/nutrition chicken 350", description: "Track a nutrition item and calories." },
  { cmd: "/today", description: "See today\'s training summary." },
  { cmd: "/week", description: "Review weekly volume and consistency." },
  { cmd: "/month", description: "Review monthly totals and trends." },
  { cmd: "/plan", description: "Run workout-plan assessment and adjustment suggestions." },
];

export const focusAreas = ["Strength", "Hypertrophy", "Conditioning", "Mobility", "Recovery"];

export const metricOptions = ["Weight", "Reps", "Duration", "Water", "Calories", "Protein", "Bodyweight", "Sleep"];

export function createWorkoutLogs() {
  return [
    weighted("Bench Press", [
      { reps: 8, weight: 225 },
      { reps: 7, weight: 225 },
      { reps: 6, weight: 225 },
      { reps: 6, weight: 220 },
    ], 0, "Push"),
    weighted("Back Squat", [
      { reps: 6, weight: 275 },
      { reps: 6, weight: 275 },
      { reps: 5, weight: 285 },
    ], 0, "Legs"),
    timed("Plank", 70, 0, "Core"),
    weighted("Barbell Row", [
      { reps: 8, weight: 195 },
      { reps: 8, weight: 195 },
      { reps: 7, weight: 195 },
    ], 1, "Pull"),
    count("Pushups", 30, 1, "Push"),
    timed("Assault Bike", 780, 2, "Conditioning"),
    weighted("Bench Press", [
      { reps: 8, weight: 220 },
      { reps: 8, weight: 220 },
      { reps: 7, weight: 220 },
      { reps: 6, weight: 220 },
    ], 3, "Push"),
    weighted("Romanian Deadlift", [
      { reps: 8, weight: 245 },
      { reps: 8, weight: 245 },
      { reps: 8, weight: 245 },
    ], 3, "Legs"),
    timed("Plank", 65, 4, "Core"),
    count("Pushups", 27, 4, "Push"),
    weighted("Pull Ups", [
      { reps: 10, weight: 0 },
      { reps: 8, weight: 0 },
      { reps: 7, weight: 0 },
    ], 5, "Pull"),
    weighted("Front Squat", [
      { reps: 5, weight: 225 },
      { reps: 5, weight: 225 },
      { reps: 4, weight: 235 },
    ], 6, "Legs"),
    weighted("Bench Press", [
      { reps: 7, weight: 220 },
      { reps: 7, weight: 220 },
      { reps: 6, weight: 220 },
      { reps: 6, weight: 220 },
    ], 7, "Push"),
    timed("Assault Bike", 720, 8, "Conditioning"),
    weighted("Barbell Row", [
      { reps: 8, weight: 190 },
      { reps: 8, weight: 190 },
      { reps: 8, weight: 190 },
    ], 8, "Pull"),
    weighted("Deadlift", [
      { reps: 4, weight: 345 },
      { reps: 4, weight: 345 },
      { reps: 3, weight: 355 },
    ], 10, "Legs"),
    timed("Plank", 60, 11, "Core"),
    weighted("Bench Press", [
      { reps: 8, weight: 215 },
      { reps: 8, weight: 215 },
      { reps: 8, weight: 215 },
      { reps: 7, weight: 215 },
    ], 12, "Push"),
    count("Pushups", 24, 14, "Push"),
    timed("Run", 1800, 15, "Conditioning"),
    weighted("Back Squat", [
      { reps: 5, weight: 265 },
      { reps: 5, weight: 265 },
      { reps: 5, weight: 265 },
    ], 16, "Legs"),
    weighted("Barbell Row", [
      { reps: 8, weight: 185 },
      { reps: 8, weight: 185 },
      { reps: 8, weight: 185 },
    ], 17, "Pull"),
    timed("Plank", 55, 18, "Core"),
    weighted("Bench Press", [
      { reps: 8, weight: 210 },
      { reps: 8, weight: 210 },
      { reps: 7, weight: 210 },
    ], 20, "Push"),
  ];
}

export function createWaterLogs() {
  return [
    { date: isoDaysAgo(0), ounces: 88 },
    { date: isoDaysAgo(1), ounces: 82 },
    { date: isoDaysAgo(2), ounces: 72 },
    { date: isoDaysAgo(3), ounces: 96 },
    { date: isoDaysAgo(4), ounces: 80 },
    { date: isoDaysAgo(5), ounces: 76 },
    { date: isoDaysAgo(6), ounces: 94 },
    { date: isoDaysAgo(7), ounces: 79 },
    { date: isoDaysAgo(9), ounces: 84 },
    { date: isoDaysAgo(11), ounces: 90 },
    { date: isoDaysAgo(14), ounces: 74 },
    { date: isoDaysAgo(18), ounces: 88 },
  ];
}

export function createNutritionLogs() {
  return [
    { date: isoDaysAgo(0), item: "Chicken bowl", calories: 640, protein: 52 },
    { date: isoDaysAgo(0), item: "Yogurt + berries", calories: 280, protein: 20 },
    { date: isoDaysAgo(1), item: "Turkey wrap", calories: 510, protein: 40 },
    { date: isoDaysAgo(2), item: "Salmon + rice", calories: 710, protein: 48 },
    { date: isoDaysAgo(3), item: "Egg scramble", calories: 420, protein: 30 },
    { date: isoDaysAgo(4), item: "Chicken + potatoes", calories: 670, protein: 49 },
    { date: isoDaysAgo(5), item: "Beef stir-fry", calories: 730, protein: 46 },
    { date: isoDaysAgo(6), item: "Protein oats", calories: 450, protein: 33 },
    { date: isoDaysAgo(9), item: "Burrito bowl", calories: 760, protein: 44 },
    { date: isoDaysAgo(12), item: "Greek salad", calories: 520, protein: 26 },
    { date: isoDaysAgo(15), item: "Chicken pasta", calories: 820, protein: 53 },
    { date: isoDaysAgo(20), item: "Tuna sandwich", calories: 470, protein: 35 },
  ];
}

export function createBodyMetrics() {
  return [
    { date: isoDaysAgo(0), bodyweight: 186.2, bodyFat: 16.8, restingHr: 58 },
    { date: isoDaysAgo(7), bodyweight: 186.9, bodyFat: 17.1, restingHr: 59 },
    { date: isoDaysAgo(14), bodyweight: 187.4, bodyFat: 17.4, restingHr: 61 },
    { date: isoDaysAgo(21), bodyweight: 188.1, bodyFat: 17.7, restingHr: 62 },
  ];
}

export function createInitialState() {
  return {
    user: {
      identity: "7373686293",
      provider: "iMessage",
      goals: "Build pressing strength while holding bodyweight and improving conditioning.",
      focusAreas: ["Strength", "Conditioning"],
      selectedMetrics: ["Weight", "Reps", "Duration", "Water", "Calories", "Bodyweight"],
      chartFrequency: "weekly",
      wantsSheets: true,
      wantsAiCoaching: true,
    },
    subscription: {
      currentPlanId: "premium",
      status: "active",
      renewalDate: "2026-05-02",
      stripeCheckoutStatus: "confirmed",
      lastPaymentDate: "2026-04-02",
      affiliateCode: "",
    },
    onboarding: {
      step: 0,
      selectedPlanId: "premium",
      checkoutState: "Idle",
      completed: false,
    },
    googleSheets: {
      enabled: true,
      url: "https://docs.google.com/spreadsheets/d/fittrack-demo-sheet",
      lastSync: "2 minutes ago",
    },
    workoutLogs: createWorkoutLogs(),
    waterLogs: createWaterLogs(),
    nutritionLogs: createNutritionLogs(),
    bodyMetrics: createBodyMetrics(),
  };
}
