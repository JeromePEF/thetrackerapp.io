// Pricing page renderer.
//
// Reads `flags.billing` from /api/control (edge-cached) and renders one card
// per tier the backend returns. Tiers are grouped by `tierType` so the
// "base" plans appear together and "premium" plans below them. Yearly cards
// auto-compute a "save X%" badge by comparing to their corresponding monthly
// tier — no hardcoded values.
//
// Backend contract:
//   billing.<key>Tier = {
//     name, price, interval ("month"|"year"|"week"),
//     features: [],
//     tierType?: "base"|"premium",        // omit ⇒ legacy, hidden
//     yearlyEquivalent?: number,          // override the auto-computed /mo price
//     stripePriceId?: string,             // optional, only used for checkout
//     monthlyEquivalentKey?: string       // override which monthly tier to
//                                         //   compare yearly card discount against
//   }
//
// Legacy keys without `tierType` (freeTier / weeklyTier / proTier on older
// backends) are skipped to avoid confusing users. Set `tierType` to surface them.

import { fetchFeatureFlags } from "./feature-flags.js";

const container = document.getElementById("pricingContainer");
const subtitle = document.getElementById("pricingSubtitle");

const TIER_TYPE_LABEL = {
  base: "Standard",
  premium: "Premium · 📷 Photo logging",
  pro: "Pro",
  enterprise: "Enterprise",
};

// Map an arbitrary tier key (e.g. "premiumYearlyTier") to a stable Stripe-friendly
// plan slug for the /login?plan=<slug> link.
function planSlug(key) {
  return String(key || "")
    .replace(/Tier$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function formatPrice(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  // Show whole dollars when clean ($10), otherwise two decimals ($9.99).
  return num % 1 === 0 ? `$${num}` : `$${num.toFixed(2)}`;
}

function formatPerMonth(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num % 1 === 0 ? `$${num}` : `$${num.toFixed(2)}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function init() {
  if (!container) return;
  loadAndRender();
  // Re-poll the control endpoint after a short delay so that if the user
  // sits on the page through a backend pricing update, the cards refresh
  // automatically. Edge cache makes this cheap.
  setInterval(loadAndRender, 5 * 60 * 1000);
}

async function loadAndRender() {
  try {
    const flags = await fetchFeatureFlags();
    const billing = flags?.billing || {};
    render(billing);
  } catch (err) {
    console.warn("Failed to load pricing:", err);
    container.innerHTML = `
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment — or
        email <a href="mailto:contact@thetrackerapp.io">contact@thetrackerapp.io</a>.
      </div>
    `;
  }
}

/**
 * Render the cards. Pulls every tier with a recognised `tierType` and groups
 * them. Defaults to a 2-up grid (base monthly+yearly) when only base tiers
 * are configured; widens to a multi-row layout when premium tiers exist.
 */
function render(billing) {
  // Collect every billable tier the backend exposed, keeping the original
  // key (e.g. "monthlyTier", "premiumYearlyTier") so we can build deep links.
  const tiers = Object.entries(billing)
    .map(([key, value]) => ({ key, ...value }))
    .filter((t) => t && typeof t === "object" && t.price != null)
    // Only render tiers that have an explicit `tierType`. Old/legacy keys
    // (freeTier, proTier) without a tierType are skipped so the page only
    // shows what's actively sold via Stripe.
    .filter((t) => typeof t.tierType === "string" && t.tierType)
    // Hide weekly plans from the public pricing page. The Weekly tier still
    // exists in `/api/control` because it is offered through the text-message
    // onboarding flow, but it should not appear on /pricing.
    .filter((t) => !(t.interval || "").toLowerCase().startsWith("week"));

  if (!tiers.length) {
    container.innerHTML = `
      <div class="pricing-error">
        No pricing plans are configured. Set <code>billing.*Tier.tierType</code>
        in the backend control panel to surface a plan here.
      </div>
    `;
    if (subtitle) subtitle.textContent = "";
    return;
  }

  // Hero subtitle: pick the largest yearly savings to highlight.
  const baseMonthly = tiers.find(
    (t) => t.tierType === "base" && (t.interval || "").startsWith("month"),
  );
  const baseYearly = tiers.find(
    (t) => t.tierType === "base" && (t.interval || "").startsWith("year"),
  );
  if (subtitle) {
    if (baseMonthly && baseYearly) {
      const pct = computeSavingsPct(baseMonthly.price, baseYearly.price);
      subtitle.textContent = pct
        ? `One plan. Pay monthly, or save ${pct}% with yearly.`
        : "Simple, transparent pricing.";
    } else {
      subtitle.textContent = "Simple, transparent pricing.";
    }
  }

  // Render every tier in a single row. Order:
  //   1. By tierType in canonical order (base → pro → premium → enterprise → others)
  //   2. Within each tierType: month → year → week (weeklies are already filtered out)
  // The purple-accent treatment on premium cards is still applied via the
  // `data-tier-type` attribute so visual distinction is preserved without
  // splitting the grid into multiple sections.
  const typeOrder = (t) => {
    const order = { base: 0, pro: 1, premium: 2, enterprise: 3 };
    return order[t.tierType] ?? 99;
  };
  const intervalOrder = (t) =>
    (t.interval || "").startsWith("year") ? 1 : (t.interval || "").startsWith("month") ? 0 : 2;

  // Find the monthly counterpart for each yearly tier (within the same tier
  // type) so the auto-computed "Save X%" badge stays accurate.
  const monthlyForTier = (tier) =>
    tiers.find(
      (t) => t.tierType === tier.tierType && (t.interval || "").startsWith("month"),
    );

  const ordered = tiers
    .slice()
    .sort((a, b) => typeOrder(a) - typeOrder(b) || intervalOrder(a) - intervalOrder(b));

  const cards = ordered
    .map((tier) =>
      renderCard(tier, {
        monthlyForComparison: monthlyForTier(tier),
      }),
    )
    .join("");

  container.innerHTML = `
    <div class="pricing-cards-row pricing-cards-row-${ordered.length}">${cards}</div>
  `;
}

function renderCard(tier, { monthlyForComparison }) {
  const isYearly = (tier.interval || "").startsWith("year");
  const isMonthly = (tier.interval || "").startsWith("month");
  const isWeekly = (tier.interval || "").startsWith("week");

  // Featured badge: only yearly cards get one, and only when there's a real
  // discount vs the monthly equivalent in the same group.
  let savingsPct = null;
  let savingsAmount = null;
  let perMonthEquivalent = null;
  if (isYearly && monthlyForComparison?.price) {
    savingsPct = computeSavingsPct(monthlyForComparison.price, tier.price);
    savingsAmount = (Number(monthlyForComparison.price) * 12) - Number(tier.price);
    perMonthEquivalent =
      Number.isFinite(Number(tier.yearlyEquivalent)) && Number(tier.yearlyEquivalent) > 0
        ? Number(tier.yearlyEquivalent)
        : Number(tier.price) / 12;
  }

  const periodLabel = tier.interval ? `/${tier.interval}` : "";
  const planLinkSlug = planSlug(tier.key);
  const ctaLabel = `Start ${(tier.name || tier.key || "").replace(/Tier$/i, "")}`.trim();
  const featured = savingsPct != null && savingsPct > 0;

  return `
    <article class="pricing-card pricing-card-${escapeHtml(tier.tierType || "default")} ${featured ? "pricing-card-featured" : ""}" data-tier="${escapeHtml(tier.key)}" data-tier-type="${escapeHtml(tier.tierType || "")}" data-stripe="${escapeHtml(tier.stripePriceId || "")}">
      ${
        featured
          ? `<div class="featured-badge">Save ${savingsPct}%</div>`
          : ""
      }
      <div class="card-header">
        <h3 class="tier-name">${escapeHtml(tier.name || tier.key)}</h3>
        <div class="tier-price">
          <span class="price-amount">${formatPrice(tier.price)}</span>
          <span class="price-period">${escapeHtml(periodLabel)}</span>
        </div>
        ${
          isYearly && perMonthEquivalent
            ? `<p class="tier-desc">${escapeHtml(formatPerMonth(perMonthEquivalent))}/mo billed annually${
                savingsAmount > 0
                  ? ` · <strong>save ${escapeHtml(formatPrice(savingsAmount))}/year</strong>`
                  : ""
              }</p>`
            : isMonthly
            ? `<p class="tier-desc">Billed monthly — cancel anytime</p>`
            : isWeekly
            ? `<p class="tier-desc">Billed weekly — pause anytime</p>`
            : ""
        }
      </div>
      <ul class="tier-features">
        ${(Array.isArray(tier.features) ? tier.features : [])
          .map((f) => `<li>${escapeHtml(f)}</li>`)
          .join("")}
      </ul>
      <a href="/login?plan=${encodeURIComponent(planLinkSlug)}"
         class="tier-cta ${featured ? "tier-cta-primary" : "tier-cta-secondary"}">
        ${escapeHtml(ctaLabel) || "Get started"}
      </a>
    </article>
  `;
}

function computeSavingsPct(monthlyPrice, yearlyPrice) {
  const m = Number(monthlyPrice);
  const y = Number(yearlyPrice);
  if (!Number.isFinite(m) || !Number.isFinite(y) || m <= 0 || y <= 0) return null;
  const expected = m * 12;
  if (y >= expected) return 0;
  return Math.round(((expected - y) / expected) * 100);
}

init();
