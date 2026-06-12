import fetch from 'node-fetch';
global.fetch = fetch;

const UPSTREAM_URL = "https://api.thetrackerapp.io/control";

async function fetchUpstreamFlags() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(UPSTREAM_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("Upstream returned non-object");
    return data;
  } catch (err) {
    console.warn("home renderer: upstream fetch failed:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

fetchUpstreamFlags().then(res => console.log(Object.keys(res || {})));
