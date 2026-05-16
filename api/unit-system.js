const IMPERIAL_COUNTRIES = new Set(["US", "LR", "MM"]);

function preferredUnitForCountry(countryCode) {
  const normalized = String(countryCode || "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return "metric";
  }

  return IMPERIAL_COUNTRIES.has(normalized) ? "imperial" : "metric";
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  const country =
    req.headers["x-vercel-ip-country"] ||
    req.headers["cf-ipcountry"] ||
    req.headers["x-country-code"] ||
    "";

  const unitSystem = preferredUnitForCountry(country);

  return res.status(200).json({
    ok: true,
    country: String(country || "").toUpperCase() || null,
    unitSystem,
  });
}
