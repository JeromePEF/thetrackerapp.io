// Feature Flags Control API Endpoint
// GET: Returns current feature flag settings
// POST: Updates feature flags (requires admin auth)

const DEFAULT_FLAGS = {
  // Pages
  blog: true,
  press: true,
  products: true,
  brackets: false,
  win: false,
  runClubs: true,
  personalTrainers: true,

  // Sections
  testimonials: true,
  faq: true,
  iphoneMockup: true,
  stepTape: true,
  bodyMeasurements: true,
  multiMetricCharts: true,
  narrative: true,

  // Tools
  tools: {
    tdeeCalculator: true,
    bmiCalculator: true,
    aiMealPlanner: true,
    foodDiary: true,
  },
};

// In production, these would be stored in a database
// For now, we use environment variables or defaults
function getFlags() {
  try {
    const envFlags = process.env.FEATURE_FLAGS;
    if (envFlags) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(envFlags) };
    }
  } catch (e) {
    console.error("Error parsing FEATURE_FLAGS env:", e);
  }
  return DEFAULT_FLAGS;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const flags = getFlags();
    return res.status(200).json(flags);
  }

  if (req.method === "POST") {
    // Admin authentication required for updates
    const authHeader = req.headers.authorization;
    const adminToken = process.env.ADMIN_API_TOKEN;

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // In production, this would update a database
    // For now, return success but note that changes aren't persisted
    const updates = req.body;

    return res.status(200).json({
      success: true,
      message: "Flags updated (note: changes require env var update to persist)",
      flags: { ...getFlags(), ...updates },
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
