// Pricing page renderer.
//
// PRICE source of truth: GET /api/billing/stripe-prices (reads Stripe directly,
// 15-min server-side cache). NEVER hardcode a price here.
//
// FEATURE bullets: admins tune them via the /control billing block, so we
// merge `flags.billing.<key>Tier.features[]` into each card.
//
// Hidden from this page (product rule): the WEEKLY tier. It still exists in
// the backend (for text-onboarding sign-ups) and the dashboard billing tab
// shows it to active weekly subscribers — but the public /pricing page only
// surfaces monthly + yearly + premium + premium-yearly.

import { fetchFeatureFlags, applyFeatureFlags } from "./feature-flags.js";
import { getBillingPrices, subscribeBillingPrices } from "./billing-prices.js";

const container = document.getElementById("pricingContainer");
const subtitle = document.getElementById("pricingSubtitle");

// Plans we surface on the public pricing page, in display order. Weekly is
// intentionally excluded — it's only accessible via text-onboarding + the
// dashboard for active weekly subscribers.
const PUBLIC_PLAN_ORDER = ["monthly", "yearly", "premium", "premiumYearly"];

// Map a public plan key to the `flags.billing.<XYZ>Tier` key where its
// feature bullets live.
const FLAG_TIER_KEY = {
  monthly: "monthlyTier",
  yearly: "yearlyTier",
  premium: "premiumTier",
  premiumYearly: "premiumYearlyTier",
  weekly: "weeklyTier",
};

const DEFAULT_NAMES = {
  monthly: "Monthly",
  yearly: "Yearly",
  premium: "Premium",
  premiumYearly: "Premium Yearly",
  weekly: "Weekly",
};

// Stale-bullet markers — when the /control admin features array contains
// any of these tokens, we ignore it and fall back to CANONICAL_FEATURES.
// Mirrors dashboard.js — we keep the two lists in sync.
const STALE_BULLET_TOKENS = [
  "everything in pro",
  "api access",
  "white-label",
  "white label",
  "custom goals",
];

// Canonical feature bullets per plan key. Used when the /control admin
// flag's features[] is empty OR contains stale tokens. Matches the
// backend handoff doc explicitly.
const CANONICAL_FEATURES = {
  monthly: [
    "Unlimited workout, nutrition & water logging",
    "Body measurements & progress charts",
    "Leaderboards, brackets & streaks",
    "Wearable integrations",
    "Cancel anytime",
  ],
  yearly: [
    "Everything in Monthly",
    "2 months free vs monthly",
    "Priority support",
    "Early access to new features",
  ],
  premium: [
    "📷 Photo-based meal logging (AI calories + macros)",
    "📷 Photo-based scale logging",
    "📷 Photo-based workout logging",
    "Nutrition-label scanning",
    "Priority AI processing",
  ],
  premiumYearly: [
    "Everything in Premium",
    "Save vs monthly Premium",
    "Priority AI processing",
    "Early access to new features",
  ],
};

function hasStaleBullet(features) {
  return features.some((f) =>
    STALE_BULLET_TOKENS.some((token) => String(f).toLowerCase().includes(token))
  );
}

function resolveFeatures(planKey, tierFlag) {
  const admin = Array.isArray(tierFlag?.features) ? tierFlag.features : [];
  if (admin.length && !hasStaleBullet(admin)) return admin.slice(0, 5);
  return (CANONICAL_FEATURES[planKey] || []).slice(0, 5);
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
  // Live re-render whenever billing-prices module fetches fresh data
  // (window focus, periodic refresh, manual invalidate).
  subscribeBillingPrices(() => loadAndRender());
  // Also re-fetch flags periodically so admin-tuned feature bullets show up.
  setInterval(loadAndRender, 5 * 60 * 1000);
}

async function loadAndRender() {
  try {
    // Force a fresh fetch on every page load (and on the 5-min interval
    // below). Admin tier-visibility toggles in /control should appear on
    // /pricing within seconds of a reload, not after a 15-min cache
    // expiry. The billing-prices module's localStorage cache still
    // provides instant first paint while the network call runs.
    const [flags, prices] = await Promise.all([
      fetchFeatureFlags(),
      getBillingPrices({ force: true }),
    ]);
    // Apply data-feature visibility to nav + footer links so Home/Community/
    // Blog only appear when /control flags them on. Otherwise they stay
    // hidden (HTML default) so we never flash links to disabled sections.
    applyFeatureFlags(flags || {});
    render({ flags: flags || {}, prices: prices || {} });
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

function isPremium(planKey) {
  return planKey === "premium" || planKey === "premiumYearly";
}

function isYearly(planKey) {
  return planKey === "yearly" || planKey === "premiumYearly";
}

function tierFromFlags(flags, planKey) {
  return flags?.billing?.[FLAG_TIER_KEY[planKey]] || null;
}

// Admin tier-visibility toggle from /api/control.
//   flags.billing.tierVisibility = { weekly, monthly, yearly, premium, premiumYearly }
// A tier is shown ONLY when its visibility flag is true. When the
// tierVisibility block is missing entirely (older /control responses or
// safe-default fallback), we treat the tier as visible — the existing
// PUBLIC_PLAN_ORDER list + Stripe price availability still govern display.
function isTierVisible(flags, planKey) {
  const v = flags?.billing?.tierVisibility;
  if (!v || typeof v !== "object") return true;
  // Explicit false hides it. Anything else (true, undefined, missing key)
  // is treated as visible. This way new tiers added in the future don't
  // silently disappear when the admin hasn't toggled them yet.
  return v[planKey] !== false;
}

function render({ flags, prices }) {
  // Build the list of public cards in three filter stages:
  //   1. PUBLIC_PLAN_ORDER  — product rule (weekly never on /pricing).
  //   2. tierVisibility     — admin can hide a tier without removing it
  //                           from Stripe (e.g. Premium currently hidden).
  //   3. Stripe price       — only render tiers Stripe is actually selling.
  const cards = PUBLIC_PLAN_ORDER.map((planKey) => {
    if (!isTierVisible(flags, planKey)) return null;
    const stripe = prices?.[planKey];
    if (!stripe?.formatted) return null;
    const tierFlag = tierFromFlags(flags, planKey);
    return {
      planKey,
      name: tierFlag?.name || DEFAULT_NAMES[planKey] || planKey,
      formatted: stripe.formatted,
      perMonth: stripe.perMonthFormatted || null,
      savings: stripe.savingsVsMonthlyFormatted || null,
      features: resolveFeatures(planKey, tierFlag),
      isPremium: isPremium(planKey),
      isYearly: isYearly(planKey),
    };
  }).filter(Boolean);

  if (!cards.length) {
    container.innerHTML = `
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment.
      </div>
    `;
    if (subtitle) subtitle.textContent = "";
    return;
  }

  // Hero subtitle: highlight yearly savings.
  if (subtitle) {
    const yearly = cards.find((c) => c.planKey === "yearly");
    if (yearly?.savings) {
      subtitle.textContent = `One plan. Pay monthly, or ${yearly.savings} with yearly.`;
    } else {
      subtitle.textContent = "Simple, transparent pricing.";
    }
  }

  const html = cards.map(renderCard).join("");
  container.innerHTML = `
    <div class="pricing-cards-row pricing-cards-row-${cards.length}">${html}</div>
  `;
}

function renderCard(card) {
  const tierTypeAttr = card.isPremium ? "premium" : "base";
  const featured = !!card.savings;
  const ctaLabel = `Start ${card.name}`;
  // /login?plan=<slug> retains the existing onboarding flow.
  const planSlug = card.planKey === "premiumYearly" ? "premium-yearly" : card.planKey;

  return `
    <article class="pricing-card pricing-card-${tierTypeAttr} ${featured ? "pricing-card-featured" : ""}"
             data-tier="${escapeHtml(card.planKey)}" data-tier-type="${tierTypeAttr}">
      ${featured ? `<div class="featured-badge">${escapeHtml(card.savings)}</div>` : ""}
      <div class="card-header">
        <h3 class="tier-name">${escapeHtml(card.name)}</h3>
        <div class="tier-price">
          <span class="price-amount">${escapeHtml(card.formatted)}</span>
        </div>
        ${
          card.isYearly && card.perMonth
            ? `<p class="tier-desc">${escapeHtml(card.perMonth)} billed annually${
                card.savings ? ` · <strong>${escapeHtml(card.savings)}</strong>` : ""
              }</p>`
            : !card.isYearly
            ? `<p class="tier-desc">Billed monthly — cancel anytime</p>`
            : ""
        }
      </div>
      <ul class="tier-features">
        ${card.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
      </ul>
      <a href="/login?plan=${encodeURIComponent(planSlug)}"
         class="tier-cta ${featured ? "tier-cta-primary" : "tier-cta-secondary"}">
        ${escapeHtml(ctaLabel)}
      </a>
    </article>
  `;
}

init();
