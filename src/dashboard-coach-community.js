// Dashboard "Coach & Community" panel.
//
// Pulls `personalTrainer`, `personalTrainerStatus`, `trainerCode`, `isPersonalTrainer`,
// `clientsAsTrainer`, `trainerApplicationStatus`, and `communities[]` from the
// authenticated `/api/account/profile` endpoint, then renders three cards:
//
//   1. Your Coach        – if the viewer is being coached (or pending / apply)
//   2. Your Athletes     – if the viewer is a PT (with their PT code)
//   3. Communities       – every Telegram group / iMessage chat / Run Club
//
// Full backend contract: see PERSONAL_TRAINERS_AND_LEADERBOARD_SPEC.txt

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

function getCurrentContact() {
  try {
    const raw = localStorage.getItem("tracker.auth.user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return (
      u?.username ||
      u?.canonical ||
      u?.credential ||
      u?.maskedCredential ||
      u?.accountId ||
      ""
    ).toString().trim();
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${path} ${res.status}: ${body || res.statusText}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function profileLink(username) {
  if (!username) return "#";
  return `/u/${encodeURIComponent(String(username).replace(/^@/, ""))}`;
}

function formatRelativeDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const COMMUNITY_LABELS = {
  telegram: "Telegram",
  imessage: "iMessage",
  "run-club": "Run Club",
  bracket: "Bracket",
};

let rootEl = null;
let cachedProfile = null;
// Other panels (the dedicated PT / Groups / Run Clubs tabs) register here so
// we can refresh them in lockstep after a profile-mutating action.
const sideTargets = new Set();

async function loadProfile() {
  let profile = null;
  try {
    profile = await apiRequest("/api/account/profile");
  } catch {
    profile = null;
  }
  if (!profile) {
    try {
      profile = JSON.parse(localStorage.getItem("tracker.auth.user") || "null");
    } catch {
      profile = null;
    }
  }
  cachedProfile = profile || {};
  return cachedProfile;
}

export async function initCoachCommunity(container) {
  if (!container) return;
  rootEl = container;

  container.innerHTML = `<p class="coach-empty">Loading coach &amp; community…</p>`;

  try {
    const profile = await loadProfile();
    renderAll(profile);
  } catch (err) {
    container.innerHTML = `<p class="coach-empty coach-error">Coach panel unavailable: ${escapeHtml(err.message || "load failed")}</p>`;
  }
}

/**
 * Render the dedicated Personal-Trainer dashboard tab. Shows the user's coach
 * + their athlete list + the "apply to become a coach" CTA in one full-width
 * panel (more spacious than the inline Stats-tab card).
 */
export async function initPersonalTrainerTab(container) {
  if (!container) return;
  sideTargets.add(container);
  container.innerHTML = `<p class="coach-empty">Loading…</p>`;
  const profile = await loadProfile();
  renderPersonalTrainerTab(container, profile);
}

/**
 * Render the dedicated Groups tab. Lists every iMessage/Telegram workout
 * group the user has joined, with controls to leave or browse more.
 */
export async function initGroupsTab(container) {
  if (!container) return;
  sideTargets.add(container);
  container.innerHTML = `<p class="coach-empty">Loading…</p>`;
  const profile = await loadProfile();
  renderCommunitiesTab(container, profile, "group", {
    title: "Workout groups",
    emptyHelp: "You haven't joined any workout groups yet.",
  });
}

/**
 * Render the dedicated Run Clubs tab.
 */
export async function initRunClubsTab(container) {
  if (!container) return;
  sideTargets.add(container);
  container.innerHTML = `<p class="coach-empty">Loading…</p>`;
  const profile = await loadProfile();
  renderCommunitiesTab(container, profile, "run-club", {
    title: "Run clubs",
    emptyHelp: "You're not in any run clubs yet.",
  });
}

async function refreshAllPanels() {
  const profile = await loadProfile();
  if (rootEl) renderAll(profile);
  for (const target of sideTargets) {
    if (target.id === "personalTrainerPanelBody") {
      renderPersonalTrainerTab(target, profile);
    } else if (target.id === "groupsPanelBody") {
      renderCommunitiesTab(target, profile, "group", {
        title: "Workout groups",
        emptyHelp: "You haven't joined any workout groups yet.",
      });
    } else if (target.id === "runClubsPanelBody") {
      renderCommunitiesTab(target, profile, "run-club", {
        title: "Run clubs",
        emptyHelp: "You're not in any run clubs yet.",
      });
    }
  }
}

/**
 * Full-width PT tab. Reuses the same card-renderers as the inline Stats panel
 * but with more breathing room and an additional application form when the
 * user has not started the "become a coach" flow.
 */
function renderPersonalTrainerTab(container, profile) {
  const isPT = !!profile.isPersonalTrainer;
  const appStatus = profile.trainerApplicationStatus || "none";

  container.innerHTML = `
    <div class="coach-community-grid pt-tab-grid">
      ${renderCoachSide(profile)}
      ${renderTrainerSide(profile)}
    </div>
    ${!isPT && (appStatus === "none" || appStatus === "rejected") ? renderApplyForm(profile) : ""}
  `;
  // Re-attach the standard event bindings + the apply-form handler.
  rootEl = container;
  bindActions(profile);
  bindApplyForm(profile);
}

/**
 * Generic communities tab renderer used for both Groups and Run Clubs.
 * Filters the user's communities array down to the requested `kind`.
 */
function renderCommunitiesTab(container, profile, kind, { title, emptyHelp }) {
  const all = Array.isArray(profile.communities) ? profile.communities : [];
  // For Groups, accept both `telegram` and `imessage` (and the generic "group" kind).
  const list =
    kind === "group"
      ? all.filter((c) => ["telegram", "imessage", "group"].includes(c.kind))
      : all.filter((c) => c.kind === "run-club");

  if (list.length === 0) {
    container.innerHTML = `
      <div class="coach-empty-card">
        <p>${escapeHtml(emptyHelp)}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="community-list">
      ${list
        .map(
          (c) => `
        <div class="community-row community-row-wide" data-community="${escapeAttr(c.id || "")}">
          <a class="community-row-link" href="${c.url ? escapeHtml(c.url) : "#"}" target="${c.url?.startsWith?.("http") ? "_blank" : "_self"}" rel="noreferrer">
            <span class="community-emoji" aria-hidden="true">${escapeHtml(c.emoji || (kind === "run-club" ? "🏃" : "👥"))}</span>
            <div class="community-info">
              <span class="community-name">${escapeHtml(c.name || title)}</span>
              <span class="community-meta">
                <span class="community-kind">${escapeHtml(COMMUNITY_LABELS[c.kind] || c.kind || "Group")}</span>
                ${c.memberCount ? `<span> · ${c.memberCount.toLocaleString()} members</span>` : ""}
                ${c.location ? `<span> · ${escapeHtml(c.location)}</span>` : ""}
                ${c.role && c.role !== "member" ? `<span class="community-role role-${escapeHtml(c.role)}">${escapeHtml(c.role)}</span>` : ""}
              </span>
            </div>
            <span class="community-since">${c.since ? `since ${escapeHtml(formatRelativeDate(c.since))}` : ""}</span>
          </a>
          <button type="button" class="btn-ghost btn-tiny" data-action="community-leave" data-community-id="${escapeAttr(c.id || "")}" data-community-name="${escapeAttr(c.name || "")}">Leave</button>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll('[data-action="community-leave"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.communityId;
      const name = btn.dataset.communityName || "this community";
      if (!id || !confirm(`Leave ${name}?`)) return;
      try {
        await apiRequest(`/api/communities/${encodeURIComponent(id)}/leave`, {
          method: "POST",
          body: "{}",
        });
        await refreshAllPanels();
      } catch (e) {
        alert(`Leave failed: ${e.message}`);
      }
    });
  });
}

// Pure application form (only used when the user has never applied or was rejected).
function renderApplyForm(profile) {
  return `
    <section class="coach-card pt-apply-card" id="ptApplyCard">
      <header class="coach-card-head">
        <h3>Become a coach</h3>
        <span class="coach-status-pill status-none">Application</span>
      </header>
      <p class="coach-note">Already training people? Send us your credentials and we'll mint your unique <strong>coach code</strong>. Once approved, athletes lock in by entering your code on their dashboard.</p>
      <form class="pt-apply-form" id="ptApplyForm" novalidate>
        <label>
          <span>Full legal name</span>
          <input name="fullName" type="text" autocomplete="name" required maxlength="120" />
        </label>
        <label>
          <span>Years coaching</span>
          <input name="experienceYears" type="number" min="0" max="60" step="1" inputmode="numeric" required />
        </label>
        <label class="pt-full">
          <span>Credentials &amp; certifications</span>
          <input name="credentials" type="text" placeholder="e.g. NSCA-CPT, RDN, USA Weightlifting L2" maxlength="200" />
        </label>
        <label class="pt-full">
          <span>Specialties</span>
          <input name="specialties" type="text" placeholder="e.g. Hybrid, Strength, Endurance, Hyrox" maxlength="200" />
        </label>
        <label class="pt-full">
          <span>Short bio for athletes</span>
          <textarea name="bio" rows="3" maxlength="500" placeholder="A few sentences athletes will see when your code is shared." required></textarea>
        </label>
        <label class="pt-full">
          <span>Portfolio / Instagram / website (optional)</span>
          <input name="portfolioUrl" type="url" placeholder="https://" maxlength="200" />
        </label>
        <label class="pt-full pt-agree">
          <input name="agreeTerms" type="checkbox" required />
          <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and confirm the credentials above are accurate.</span>
        </label>
        <div class="pt-apply-actions">
          <button type="submit" class="btn-primary">Submit application</button>
          <p class="coach-error coach-action-status" data-status-for="trainer-apply" hidden></p>
        </div>
      </form>
    </section>
  `;
}

function bindApplyForm(profile) {
  const form = document.getElementById("ptApplyForm");
  if (!form) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const body = {
      fullName: String(fd.get("fullName") || "").trim(),
      experienceYears: Number(fd.get("experienceYears") || 0),
      credentials: String(fd.get("credentials") || "")
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      specialties: String(fd.get("specialties") || "")
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      bio: String(fd.get("bio") || "").trim(),
      portfolioUrl: String(fd.get("portfolioUrl") || "").trim(),
      agreeTerms: !!fd.get("agreeTerms"),
    };
    if (!body.agreeTerms) return;
    await runAction("trainer-apply", async () => {
      await apiRequest("/api/trainer/application", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await refreshAllPanels();
    });
  });
}

function renderAll(profile) {
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div class="coach-community-grid">
      ${renderTrainerSide(profile)}
      ${renderCoachSide(profile)}
      ${renderCommunities(profile)}
    </div>
  `;
  bindActions(profile);
}

/**
 * Left card: "Your Coach" — the PT linked to this athlete (if any), or a CTA
 * to redeem a code, or a pending request status.
 */
function renderCoachSide(profile) {
  const status = profile.personalTrainerStatus || (profile.personalTrainer ? "linked" : "none");
  const trainer = profile.personalTrainer;
  const pending = profile.trainerCodePending;

  let body = "";
  if (status === "linked" && trainer) {
    body = `
      <div class="coach-figure">
        <div class="coach-avatar" aria-hidden="true">${escapeHtml(trainer.displayName?.slice(0, 1) || "C")}</div>
        <div class="coach-info">
          <a class="coach-name" href="${profileLink(trainer.username)}">${escapeHtml(trainer.displayName || trainer.username || "Coach")}</a>
          <span class="coach-sub">@${escapeHtml(trainer.username || "")}${trainer.since ? ` · since ${escapeHtml(formatRelativeDate(trainer.since))}` : ""}</span>
        </div>
      </div>
      <div class="coach-actions">
        <a class="btn-secondary" href="${profileLink(trainer.username)}">View profile</a>
        <button type="button" class="btn-ghost" data-action="trainer-unlink">Unlink coach</button>
      </div>
      <p class="coach-error coach-action-status" data-status-for="trainer-unlink" hidden></p>
    `;
  } else if (status === "pending" && pending) {
    body = `
      <div class="coach-pending">
        <div class="coach-pending-emoji">⏳</div>
        <div>
          <p class="coach-pending-title">Waiting on <strong>@${escapeHtml(pending.trainerUsername)}</strong></p>
          <p class="coach-pending-sub">Sent ${escapeHtml(formatRelativeDate(pending.submittedAt))} — your coach will get a text to approve.</p>
        </div>
      </div>
      <button type="button" class="btn-ghost" data-action="trainer-cancel">Cancel request</button>
      <p class="coach-error coach-action-status" data-status-for="trainer-cancel" hidden></p>
    `;
  } else {
    const helper = status === "rejected"
      ? `<p class="coach-note">Your last request wasn't accepted. Try another coach's code below.</p>`
      : `<p class="coach-note">Got a coach's invite code? Enter it here and we'll text them to approve you.</p>`;
    body = `
      ${helper}
      <form class="coach-code-form" data-action="trainer-redeem-form">
        <label class="sr-only" for="trainerCodeInput">Coach code</label>
        <input id="trainerCodeInput" name="code" type="text" autocomplete="off" placeholder="RIVER-9X4P" maxlength="32" />
        <button type="submit" class="btn-primary">Send to coach</button>
      </form>
      <p class="coach-error coach-action-status" data-status-for="trainer-redeem" hidden></p>
    `;
  }

  return `
    <article class="coach-card">
      <header class="coach-card-head">
        <h3>Your coach</h3>
        ${status !== "linked" ? `<span class="coach-status-pill status-${status}">${escapeHtml(status === "none" ? "Unlinked" : status)}</span>` : `<span class="coach-status-pill status-linked">Linked</span>`}
      </header>
      ${body}
    </article>
  `;
}

/**
 * Right card: "Your Athletes" + trainer code, OR "Become a coach" CTA if the
 * user has not been approved as a PT yet.
 */
function renderTrainerSide(profile) {
  const isPT = !!profile.isPersonalTrainer;
  const appStatus = profile.trainerApplicationStatus || "none";

  if (!isPT) {
    // Application card
    let body = "";
    if (appStatus === "pending") {
      body = `
        <div class="coach-pending">
          <div class="coach-pending-emoji">📝</div>
          <div>
            <p class="coach-pending-title">Application pending</p>
            <p class="coach-pending-sub">An admin is reviewing your credentials. You'll get a text when you're approved.</p>
          </div>
        </div>
        <button type="button" class="btn-ghost" data-action="trainer-app-withdraw">Withdraw application</button>
        <p class="coach-error coach-action-status" data-status-for="trainer-app-withdraw" hidden></p>
      `;
    } else if (appStatus === "rejected") {
      body = `
        <p class="coach-note coach-error">Your last application wasn't approved. Add credentials and try again.</p>
        <a href="/personal-trainers#apply" class="btn-primary">Apply again</a>
      `;
    } else {
      body = `
        <p class="coach-note">Already coaching people? Apply to verify your credentials and get a unique <strong>coach code</strong> you can share. Once approved, athletes can lock in by entering your code on their dashboard.</p>
        <a href="/personal-trainers#apply" class="btn-primary">Apply to become a coach</a>
      `;
    }
    return `
      <article class="coach-card trainer-card">
        <header class="coach-card-head">
          <h3>Coach status</h3>
          <span class="coach-status-pill status-${appStatus}">${escapeHtml(appStatus === "none" ? "Not applied" : appStatus)}</span>
        </header>
        ${body}
      </article>
    `;
  }

  // Approved PT view: show code + clients
  const code = profile.trainerCode || "—";
  const clients = Array.isArray(profile.clientsAsTrainer) ? profile.clientsAsTrainer : [];
  const accepting = profile.trainerSettings?.acceptingClients ?? true;

  return `
    <article class="coach-card trainer-card">
      <header class="coach-card-head">
        <h3>Your athletes</h3>
        <span class="coach-status-pill status-linked">Coach</span>
      </header>
      <div class="trainer-code-row">
        <div>
          <span class="coach-sub">Your coach code</span>
          <div class="trainer-code">${escapeHtml(code)}</div>
        </div>
        <button type="button" class="btn-secondary" data-action="copy-trainer-code" data-code="${escapeHtml(code)}">Copy</button>
      </div>
      <label class="trainer-accepting">
        <input type="checkbox" data-action="trainer-toggle-accepting" ${accepting ? "checked" : ""}>
        <span>Accepting new athletes</span>
      </label>
      <div class="trainer-clients">
        <p class="coach-sub">${clients.length === 0 ? "No athletes yet — share your code to get started." : `${clients.length} ${clients.length === 1 ? "athlete" : "athletes"}`}</p>
        ${clients
          .slice(0, 8)
          .map(
            (c) => `
          <a class="trainer-client" href="${profileLink(c.username)}">
            <span class="client-avatar" aria-hidden="true">${escapeHtml(c.displayName?.slice(0, 1) || c.username?.slice(0, 1) || "?")}</span>
            <span class="client-name">${escapeHtml(c.displayName || c.username || "Athlete")}</span>
            <span class="client-status status-${c.status || "active"}">${escapeHtml(c.status || "active")}</span>
            <span class="client-since">${c.lastLog ? `last ${escapeHtml(formatRelativeDate(c.lastLog))}` : ""}</span>
          </a>`
          )
          .join("")}
        ${clients.length > 8 ? `<a class="trainer-clients-more" href="/personal-trainers#mine">+ ${clients.length - 8} more</a>` : ""}
      </div>
      <p class="coach-error coach-action-status" data-status-for="trainer-toggle-accepting" hidden></p>
    </article>
  `;
}

/**
 * Bottom-spanning card: every group / run-club / bracket the user belongs to.
 */
function renderCommunities(profile) {
  const list = Array.isArray(profile.communities) ? profile.communities : [];
  if (list.length === 0) {
    return `
      <article class="coach-card communities-card">
        <header class="coach-card-head">
          <h3>Communities</h3>
        </header>
        <p class="coach-note">You haven't joined any workout groups, run clubs, or brackets yet.</p>
        <div class="coach-cta-row">
          <a class="btn-secondary" href="/groups">Find a group</a>
          <a class="btn-ghost" href="/run-clubs">Browse run clubs</a>
          <a class="btn-ghost" href="/brackets" data-feature="brackets">Brackets</a>
        </div>
      </article>
    `;
  }

  return `
    <article class="coach-card communities-card">
      <header class="coach-card-head">
        <h3>Communities</h3>
        <span class="coach-sub">${list.length} membership${list.length === 1 ? "" : "s"}</span>
      </header>
      <div class="community-list">
        ${list
          .map(
            (c) => `
          <a class="community-row" href="${c.url ? escapeHtml(c.url) : "#"}" target="${c.url?.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">
            <span class="community-emoji" aria-hidden="true">${escapeHtml(c.emoji || "👥")}</span>
            <div class="community-info">
              <span class="community-name">${escapeHtml(c.name || "Community")}</span>
              <span class="community-meta">
                <span class="community-kind">${escapeHtml(COMMUNITY_LABELS[c.kind] || c.kind || "Group")}</span>
                ${c.memberCount ? `<span> · ${c.memberCount.toLocaleString()} members</span>` : ""}
                ${c.location ? `<span> · ${escapeHtml(c.location)}</span>` : ""}
                ${c.role && c.role !== "member" ? `<span class="community-role role-${escapeHtml(c.role)}">${escapeHtml(c.role)}</span>` : ""}
              </span>
            </div>
            <span class="community-since">${c.since ? `since ${escapeHtml(formatRelativeDate(c.since))}` : ""}</span>
          </a>`
          )
          .join("")}
      </div>
      <div class="coach-cta-row">
        <a class="btn-ghost" href="/groups">Discover groups</a>
        <a class="btn-ghost" href="/run-clubs">Discover run clubs</a>
      </div>
    </article>
  `;
}

// ---------- actions ----------

function bindActions(profile) {
  if (!rootEl) return;

  // Trainer code redemption
  rootEl.querySelector('[data-action="trainer-redeem-form"]')?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const form = ev.currentTarget;
    const input = form.querySelector("input[name='code']");
    const code = (input?.value || "").trim();
    if (!code) return;
    await runAction("trainer-redeem", async () => {
      await apiRequest("/api/account/trainer-code/redeem", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      await initCoachCommunity(rootEl);
    });
  });

  rootEl.querySelector('[data-action="trainer-cancel"]')?.addEventListener("click", async () => {
    await runAction("trainer-cancel", async () => {
      await apiRequest("/api/account/trainer-code/cancel", { method: "POST", body: "{}" });
      await initCoachCommunity(rootEl);
    });
  });

  rootEl.querySelector('[data-action="trainer-unlink"]')?.addEventListener("click", async () => {
    if (!confirm("Unlink from your coach? You can lock back in later with their code.")) return;
    await runAction("trainer-unlink", async () => {
      const me = getCurrentContact();
      await apiRequest(`/api/trainer/clients/${encodeURIComponent(me)}/remove`, { method: "POST", body: "{}" });
      await initCoachCommunity(rootEl);
    });
  });

  rootEl.querySelector('[data-action="trainer-app-withdraw"]')?.addEventListener("click", async () => {
    await runAction("trainer-app-withdraw", async () => {
      await apiRequest("/api/trainer/application/withdraw", { method: "POST", body: "{}" });
      await initCoachCommunity(rootEl);
    });
  });

  rootEl.querySelector('[data-action="copy-trainer-code"]')?.addEventListener("click", async (ev) => {
    const code = ev.currentTarget.dataset.code;
    try {
      await navigator.clipboard.writeText(code);
      ev.currentTarget.textContent = "Copied!";
      setTimeout(() => (ev.currentTarget.textContent = "Copy"), 1500);
    } catch {
      /* clipboard unavailable */
    }
  });

  rootEl.querySelector('[data-action="trainer-toggle-accepting"]')?.addEventListener("change", async (ev) => {
    const checked = !!ev.target.checked;
    await runAction("trainer-toggle-accepting", async () => {
      await apiRequest(`/api/account/profile?contact=${encodeURIComponent(getCurrentContact())}`, {
        method: "PATCH",
        body: JSON.stringify({ trainerSettings: { acceptingClients: checked } }),
      });
    });
  });
}

async function runAction(name, fn) {
  const statusEl = rootEl?.querySelector(`[data-status-for="${name}"]`);
  if (statusEl) {
    statusEl.hidden = true;
    statusEl.textContent = "";
  }
  try {
    await fn();
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = err?.message || "Request failed";
      statusEl.hidden = false;
    } else {
      console.warn(`coach-community action '${name}' failed:`, err);
    }
  }
}

export default initCoachCommunity;
