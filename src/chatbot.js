// Site-wide AI chatbot widget — floats in the bottom-right of every page.
//
// Lifecycle:
//   1. feature-flags.js calls initChatbot() with the resolved /api/control
//      response. We bail out unless `flags.chatbotEnabled === true`.
//   2. We render a small launcher button. Click → expanded chat panel.
//   3. Messages flow through POST /api/chat/message which returns the AI
//      response. The frontend stays stateless; the backend keeps the
//      conversation history keyed by `sessionId`.
//   4. "Talk to an agent" button (or typing "agent") calls POST
//      /api/chat/request-agent. Once handed off, the frontend polls
//      GET /api/chat/messages?sessionId=… every ~6 s for new replies and
//      surfaces a small "Agent has joined" banner.
//   5. sessionId + minimal transcript are persisted in localStorage so a
//      refresh or navigation doesn't lose context.
//
// Backend contract (see BACKEND_REQUIREMENTS.txt → CHATBOT):
//   POST  /api/chat/message
//     body:  { sessionId, contact?, message, context: { page, url } }
//     reply: { ok, sessionId, reply, mode: "ai"|"agent", handedOff,
//              suggestedActions?: [ { label, url, kind } ] }
//
//   POST  /api/chat/request-agent
//     body:  { sessionId, reason?: "string", contact? }
//     reply: { ok, sessionId, eta?: "X minutes", mode: "agent",
//              greeting?: "Hi I'm Sarah, how can I help?" }
//
//   GET   /api/chat/messages?sessionId=…&since=<isoTimestamp>
//     reply: { ok, messages: [ { id, role:"ai"|"agent"|"user"|"system",
//                                text, agentName?, ts } ], mode }

const API_BASE = "https://api.thetrackerapp.io";
const SESSION_KEY = "tracker.chat.session";
const TRANSCRIPT_KEY = "tracker.chat.transcript";
const POLL_INTERVAL_MS = 6000;
const MAX_INPUT_LEN = 1000;

let rootEl = null;
let panelEl = null;
let messagesEl = null;
let inputEl = null;
let sendBtn = null;
let agentBtn = null;
let launcherEl = null;
let unreadBadgeEl = null;

let state = {
  open: false,
  busy: false,
  mode: "ai",          // "ai" | "agent"
  ticketId: null,
  pollTimer: null,
  lastPolledAt: null,
};

let session = loadSession();
let transcript = loadTranscript();

function loadSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || "";
  } catch {
    return "";
  }
}
function persistSession(id) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* ignore quota errors */
  }
}
function loadTranscript() {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch {
    return [];
  }
}
function persistTranscript() {
  try {
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(transcript.slice(-50)));
  } catch {
    /* ignore */
  }
}

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

function getContact() {
  try {
    const raw = localStorage.getItem("tracker.auth.user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return (u?.username || u?.canonical || u?.credential || u?.maskedCredential || u?.accountId || "")
      .toString()
      .trim();
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Defence-in-depth phone-number redaction. The backend is responsible for
 * stripping phone numbers from agent/AI replies (see LIVE_AGENT_BACKEND.txt);
 * this client-side scrub catches anything the backend missed so users never
 * see raw operator numbers like "7373686293" leak through.
 *
 * Matches:
 *   - 10–15 consecutive digits (international format)
 *   - North-American (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx
 *   - With optional +<country> prefix
 *
 * Leaves untouched:
 *   - Ticket IDs (e.g. TX-83A21) — they contain hyphens with letters
 *   - 4-6 digit codes (PINs, dates, prices, calorie counts)
 *   - Short dates (5/22 etc.)
 */
function redactPhoneNumbers(text) {
  if (!text) return "";
  let out = String(text);
  // (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, optional +1 prefix
  out = out.replace(
    /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    "Live Agent",
  );
  // Bare 10–15 digit runs
  out = out.replace(/\+?\b\d{10,15}\b/g, "Live Agent");
  return out;
}

function linkify(text) {
  // Redact phone numbers before escaping so the digits never reach the DOM.
  const redacted = redactPhoneNumbers(text);
  let html = escapeHtml(redacted);
  // Render markdown-y links [label](https://…) and bare URLs as anchors.
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, label, url) =>
    `<a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`,
  );
  html = html.replace(/(^|[\s])(https?:\/\/[^\s<]+)/g, (m, pre, url) =>
    `${pre}<a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`,
  );
  return html.replace(/\n/g, "<br>");
}

// ---------- public API ----------

export function initChatbot(flags) {
  // Backend can toggle the widget on per page-load.
  if (!flags || flags.chatbotEnabled !== true) {
    teardown();
    return;
  }
  if (rootEl) return; // already mounted

  rootEl = document.createElement("div");
  rootEl.className = "tracker-chatbot";
  rootEl.innerHTML = renderShell();
  document.body.appendChild(rootEl);

  launcherEl = rootEl.querySelector(".chat-launcher");
  panelEl = rootEl.querySelector(".chat-panel");
  messagesEl = rootEl.querySelector(".chat-messages");
  inputEl = rootEl.querySelector(".chat-input");
  sendBtn = rootEl.querySelector(".chat-send");
  agentBtn = rootEl.querySelector(".chat-agent-btn");
  unreadBadgeEl = rootEl.querySelector(".chat-unread");

  // Restore prior transcript so the widget feels continuous across navigations.
  if (transcript.length) {
    renderMessages();
  } else {
    pushMessage({
      role: "ai",
      text:
        "Hi! I'm the Tracker App assistant. Ask me anything about logging workouts, " +
        "nutrition, billing, or anything else. If you need a human I can hand you " +
        "off — just say \"agent\".",
      ts: new Date().toISOString(),
    });
  }

  bindEvents();
}

function teardown() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
  if (rootEl) {
    rootEl.remove();
    rootEl = panelEl = messagesEl = inputEl = sendBtn = agentBtn = launcherEl = unreadBadgeEl = null;
  }
}

// ---------- markup ----------

function renderShell() {
  return `
    <button type="button" class="chat-launcher" aria-label="Open chat support">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 11.5c0 4.142-4.03 7.5-9 7.5-1.155 0-2.262-.18-3.27-.51L4 20l1.6-3.4C4.6 15.27 4 13.94 4 12.5 4 8.358 8.03 5 13 5h.5C18.05 5 21 8.04 21 11.5z"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="chat-launcher-label">Chat with us</span>
      <span class="chat-unread" hidden>•</span>
    </button>

    <section class="chat-panel" role="dialog" aria-label="Tracker App chat" hidden>
      <header class="chat-panel-head">
        <div class="chat-head-left">
          <span class="chat-head-avatar" aria-hidden="true">🤖</span>
          <div>
            <span class="chat-head-title">Tracker Assistant</span>
            <span class="chat-head-sub" id="chatHeadSub">AI · typically replies instantly</span>
          </div>
        </div>
        <button type="button" class="chat-close" aria-label="Close chat">×</button>
      </header>

      <div class="chat-messages" aria-live="polite"></div>

      <div class="chat-actions">
        <button type="button" class="chat-agent-btn">Talk to a human</button>
      </div>

      <form class="chat-form" novalidate>
        <textarea class="chat-input" rows="1" placeholder="Ask anything…" autocomplete="off" maxlength="${MAX_INPUT_LEN}"></textarea>
        <button type="submit" class="chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12l18-9-4 9 4 9z" fill="currentColor"/>
          </svg>
        </button>
      </form>
      <p class="chat-foot">
        Powered by The Tracker App. Don't share credit card numbers or 2FA codes in chat.
      </p>
    </section>
  `;
}

function bindEvents() {
  launcherEl.addEventListener("click", openPanel);
  rootEl.querySelector(".chat-close").addEventListener("click", closePanel);
  agentBtn.addEventListener("click", () => requestAgent());

  // Auto-grow textarea up to 5 rows.
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(120, inputEl.scrollHeight) + "px";
  });

  inputEl.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      submit();
    }
  });

  rootEl.querySelector(".chat-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    submit();
  });

  // Close on Escape when panel is open
  document.addEventListener("keydown", (ev) => {
    if (state.open && ev.key === "Escape") closePanel();
  });
}

// ---------- panel state ----------

function openPanel() {
  state.open = true;
  panelEl.hidden = false;
  launcherEl.setAttribute("aria-expanded", "true");
  hideUnread();
  // Resume polling if we were in agent mode.
  if (state.mode === "agent") startPolling();
  // Scroll to bottom + focus input.
  requestAnimationFrame(() => {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    inputEl?.focus();
  });
}

function closePanel() {
  state.open = false;
  panelEl.hidden = true;
  launcherEl.setAttribute("aria-expanded", "false");
  // Keep polling even when closed so the unread badge can light up when an
  // agent responds — but back off a bit by relying on the existing interval.
}

function showUnread() {
  if (state.open || !unreadBadgeEl) return;
  unreadBadgeEl.hidden = false;
}

function hideUnread() {
  if (unreadBadgeEl) unreadBadgeEl.hidden = true;
}

// ---------- message handling ----------

function pushMessage(msg) {
  transcript.push(msg);
  persistTranscript();
  renderMessages();
  if (!state.open && msg.role !== "user") showUnread();
}

function renderMessages() {
  if (!messagesEl) return;
  messagesEl.innerHTML = transcript
    .map((m) => {
      const author =
        m.role === "agent"
          ? `<span class="chat-msg-author">${escapeHtml(m.agentName || "Support")}</span>`
          : m.role === "ai"
          ? `<span class="chat-msg-author">Assistant</span>`
          : "";
      const actions =
        Array.isArray(m.suggestedActions) && m.suggestedActions.length
          ? `<div class="chat-msg-actions">${m.suggestedActions
              .map(
                (a) =>
                  `<a class="chat-msg-action" href="${escapeHtml(a.url || "#")}" ${
                    a.url?.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""
                  }>${escapeHtml(a.label || a.kind || "Open")}</a>`,
              )
              .join("")}</div>`
          : "";
      return `
      <div class="chat-msg chat-msg-${m.role}">
        ${author}
        <div class="chat-msg-body">${linkify(m.text || "")}</div>
        ${actions}
      </div>
    `;
    })
    .join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setHeadSub(text) {
  const el = rootEl?.querySelector("#chatHeadSub");
  if (el) el.textContent = text;
}

function setBusy(busy) {
  state.busy = busy;
  if (sendBtn) sendBtn.disabled = busy;
  if (inputEl) inputEl.disabled = busy;
}

function showTyping() {
  if (!messagesEl) return null;
  const node = document.createElement("div");
  node.className = "chat-msg chat-msg-ai chat-msg-typing";
  node.innerHTML = `
    <span class="chat-msg-author">Assistant</span>
    <div class="chat-msg-body">
      <span class="chat-typing">
        <span></span><span></span><span></span>
      </span>
    </div>
  `;
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return node;
}

// ---------- send / agent flows ----------

async function submit() {
  if (state.busy) return;
  const text = (inputEl?.value || "").trim();
  if (!text) return;
  inputEl.value = "";
  inputEl.style.height = "auto";

  // Optimistic user bubble + intent detection for "agent".
  pushMessage({ role: "user", text, ts: new Date().toISOString() });

  // Keyword escalation
  if (/^(agent|human|talk to (a |an )?(person|agent|human)|support|representative)\b/i.test(text)) {
    await requestAgent(text);
    return;
  }

  setBusy(true);
  const typing = showTyping();
  try {
    const data = await api("/api/chat/message", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session || undefined,
        contact: getContact() || undefined,
        message: text,
        context: { page: location.pathname, url: location.href },
      }),
    });
    typing?.remove();
    if (data?.sessionId) {
      session = data.sessionId;
      persistSession(session);
    }
    state.mode = data?.mode === "agent" ? "agent" : "ai";
    if (data?.ticketId) state.ticketId = data.ticketId;
    if (state.mode === "agent") {
      const ticket = state.ticketId ? ` · ${state.ticketId}` : "";
      setHeadSub(`Human · usually replies within minutes${ticket}`);
    }
    pushMessage({
      role: state.mode === "agent" ? "agent" : "ai",
      text: data?.reply || "Hmm — got an empty reply. Try again?",
      suggestedActions: data?.suggestedActions,
      ts: new Date().toISOString(),
      agentName: data?.agentName,
    });
    if (data?.handedOff) startPolling();
  } catch (err) {
    typing?.remove();
    pushMessage({
      role: "system",
      text: `Couldn't reach the chat backend (${err.message || "request failed"}). ` +
            `You can also email support@thetrackerapp.io.`,
      ts: new Date().toISOString(),
    });
  } finally {
    setBusy(false);
    inputEl.focus();
  }
}

async function requestAgent(originalMessage) {
  setBusy(true);
  const typing = showTyping();
  try {
    const data = await api("/api/chat/request-agent", {
      method: "POST",
      body: JSON.stringify({
        sessionId: session || undefined,
        contact: getContact() || undefined,
        reason: originalMessage || undefined,
      }),
    });
    typing?.remove();
    if (data?.sessionId) {
      session = data.sessionId;
      persistSession(session);
    }
    state.mode = "agent";
    if (data?.ticketId) state.ticketId = data.ticketId;
    const ticket = state.ticketId ? ` · ${state.ticketId}` : "";
    setHeadSub(`Human · ${data?.eta ? `ETA ${data.eta}` : "usually replies within minutes"}${ticket}`);
    pushMessage({
      role: "system",
      text:
        data?.greeting ||
        `Got it — Live Agent will jump in${data?.eta ? ` in ${data.eta}` : " shortly"}` +
          `${state.ticketId ? ` · ticket ${state.ticketId}` : ""}. ` +
          `Feel free to keep typing in the meantime.`,
      ts: new Date().toISOString(),
    });
    startPolling();
  } catch (err) {
    typing?.remove();
    pushMessage({
      role: "system",
      text:
        `Couldn't reach a human right now (${err.message || "request failed"}). ` +
        `Please email support@thetrackerapp.io — we usually reply within a few hours.`,
      ts: new Date().toISOString(),
    });
  } finally {
    setBusy(false);
  }
}

// ---------- polling for agent replies ----------

function startPolling() {
  if (state.pollTimer) return;
  state.pollTimer = setInterval(poll, POLL_INTERVAL_MS);
  poll();
}

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
}

async function poll() {
  if (!session) return;
  try {
    const params = new URLSearchParams({ sessionId: session });
    if (state.lastPolledAt) params.set("since", state.lastPolledAt);
    const data = await api(`/api/chat/messages?${params.toString()}`);
    state.lastPolledAt = new Date().toISOString();
    if (Array.isArray(data?.messages)) {
      for (const m of data.messages) {
        // Skip messages we already have (best-effort dedupe by id).
        if (m.id && transcript.some((t) => t.id === m.id)) continue;
        pushMessage({
          id: m.id,
          role: m.role || (data.mode === "agent" ? "agent" : "ai"),
          text: m.text || "",
          agentName: m.agentName,
          ts: m.ts || new Date().toISOString(),
        });
      }
    }
    if (data?.mode === "agent") setHeadSub("Human · live");
    // If the session was closed by an agent, stop polling.
    if (data?.closed) stopPolling();
  } catch {
    // Silent — we'll just retry on the next tick.
  }
}

export default initChatbot;
