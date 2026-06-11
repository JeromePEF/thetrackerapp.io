export default async function handler(req, res) {
  try {
    const r = await fetch("https://api.thetrackerapp.io/control", {
      headers: { "User-Agent": "Vercel-Debug" }
    });
    const text = await r.text();
    res.status(200).json({ status: r.status, ok: r.ok, text: text.slice(0, 500) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}