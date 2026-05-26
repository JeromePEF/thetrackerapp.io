// Public "Become a coach" form handler for /personal-trainers#apply.
//
// Posts to POST https://api.thetrackerapp.io/api/trainer/application
// (or /api/trainer/application/public for the version that accepts
// applications from logged-out visitors — see PERSONAL_TRAINER_BACKEND.txt).
// Backend should flip the application to status=pending and email/text the
// admin team for manual review. Once approved, the user account is marked
// isPersonalTrainer:true and a `trainerCode` is minted.

const API_BASE = "https://api.thetrackerapp.io";

function getAuthToken() {
  try {
    const raw = localStorage.getItem("tracker.auth.session");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      const token = parsed && (parsed.token || parsed.accessToken);
      if (token) return String(token).trim();
    } catch {
      /* fall through */
    }
    return String(raw).trim();
  } catch {
    return "";
  }
}

function setStatus(el, message, kind = "info") {
  if (!el) return;
  el.textContent = message;
  el.classList.remove("is-error", "is-success", "is-info");
  el.classList.add(`is-${kind}`);
}

function commaList(value) {
  return String(value || "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const form = document.getElementById("ptSignupForm");
const status = document.getElementById("ptSignupStatus");

if (form) {
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setStatus(status, "", "info");

    const fd = new FormData(form);
    const body = {
      fullName: String(fd.get("fullName") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      city: String(fd.get("city") || "").trim(),
      experienceYears: Number(fd.get("experienceYears") || 0),
      credentials: commaList(fd.get("credentials")),
      specialties: commaList(fd.get("specialties")),
      bio: String(fd.get("bio") || "").trim(),
      portfolioUrl: String(fd.get("portfolioUrl") || "").trim(),
      agreeTerms: !!fd.get("agreeTerms"),
    };

    if (!body.agreeTerms) {
      setStatus(status, "Please agree to the terms to continue.", "error");
      return;
    }
    if (!body.fullName || !body.email || !body.bio || !body.city) {
      setStatus(status, "Please fill out the required fields.", "error");
      return;
    }

    const token = getAuthToken();
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Authenticated visitors hit the regular endpoint; anonymous ones use the
    // public variant. Backend may treat them identically or apply different
    // anti-abuse rules.
    const endpoint = token
      ? `${API_BASE}/api/trainer/application`
      : `${API_BASE}/api/trainer/application/public`;

    setStatus(status, "Submitting your application…", "info");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }
      const payload = await res.json().catch(() => ({}));
      setStatus(
        status,
        payload?.message ||
          "Thanks! Your application is pending review. We'll text you when an admin approves it.",
        "success",
      );
      form.reset();
    } catch (err) {
      setStatus(status, `Couldn't submit: ${err.message || err}`, "error");
    }
  });
}
