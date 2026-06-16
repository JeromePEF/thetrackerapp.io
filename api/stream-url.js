// GET /api/stream-url
//
// Fetches https://www.youtube.com/@thetrackerappio/live and extracts the
// current live video ID from the page HTML. Returns { videoId } as JSON.
// Edge-cached for 60s so YouTube is hit at most once per minute per region.

const CHANNEL_LIVE_URL = "https://www.youtube.com/@thetrackerappio/live";

async function extractVideoId() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(CHANNEL_LIVE_URL, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; TheTrackerApp/1.0; +https://thetrackerapp.io)",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"videoId":"([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Vary", "Accept-Encoding");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const videoId = await extractVideoId();

  if (videoId) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
    return res.status(200).json({ videoId });
  }

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
  return res.status(200).json({ videoId: null });
}
