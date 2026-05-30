# SEO Plan — thetrackerapp.io

**Owner:** RD
**Started:** 2026-05-30
**Strategic frame:** Ronald Gage's "schema as unfair advantage" playbook, adapted from local-trade SEO to a global SaaS. The local-business slug trick (`/exterior-siding-colorado-springs`) translates here to **channel-modified slugs** (`/imessage-calorie-tracker`, `/telegram-workout-log`, `/sms-water-tracker`, etc.). The universal verticals — calorie tracker, workout log, nutrition tracker, water tracker — are oversaturated (MyFitnessPal, Cronometer, Lose It, Strava). The `[messaging-app] + [vertical]` cross-product is wide-open long-tail with real intent. **That's the moat.**

Revisit this doc every Friday. Lock the new winning phrases each Saturday from a fresh Keyword Planner pull.

---

## Decisions locked

| Decision | Choice | Why |
|---|---|---|
| URL pattern | Flat: `/imessage-calorie-tracker` | One hop from root, every keyword in the slug, mirrors Ronald's flat philosophy. Best ranking signal per page. |
| Sitemap source of truth | `scripts/generate-sitemap.mjs` | Hand-edited XML drifts. mtime-derived `lastmod` keeps crawl signals honest. |
| Schema validator | Google Rich Results Test (manual) → `scripts/validate-schema.mjs` (CI, Week 3) | Ronald's rule: zero errors, zero warnings before deploy. |
| Channels in scope | iMessage, SMS, Telegram, Discord, WhatsApp, Signal | All six get landing pages. WeChat/LINE deferred until volume justifies. |
| Verticals in scope | calorie, workout, nutrition, water/hydration, step counter, body measurement, TDEE, BMI, macros, meal planning | Top-5 get dedicated landing pages. Rest get cross-product pages or tools. |

---

## Phase 0 — Week 0 (May 30 → Jun 5, 2026): FOUNDATIONS

**Goal:** Stop bleeding crawl budget on a starving sitemap. Get measurement infrastructure online so every later change has a baseline.

- [x] **Inventory every public route** — 26 indexable URLs identified.
- [x] **Generator-based sitemap** — `npm run sitemap:build` writes `public/sitemap.xml` from `PUBLIC_ROUTES` registry in `scripts/generate-sitemap.mjs`. Adding a page is now a one-line change.
- [x] **Sitemap regenerated** — 10 URLs → 26 URLs.
- [ ] **Google Search Console**
  - Verify `thetrackerapp.io` as a Domain property (DNS TXT record on Vercel-managed DNS).
  - Verify `dashboard.thetrackerapp.io` as a separate URL-prefix property (gated content, but worth tracking impressions).
  - Submit `https://thetrackerapp.io/sitemap.xml`.
  - Enable email alerts for Core Web Vitals + Manual Actions.
- [ ] **Bing Webmaster Tools**
  - Verify via meta tag or XML file.
  - Import settings from GSC (one-click via "Import from GSC").
  - Submit sitemap.
- [ ] **Keyword Planner pass #1** — fill in `SEO_KEYWORDS.md`. Lock the winning phrase per page. Output is the single artifact the rest of the plan compiles against.
- [ ] **Pre-build sitemap hook** — add `"prebuild": "npm run sitemap:build"` to `package.json` so every Vercel deploy ships a fresh sitemap with current mtimes. (Deferred until we're sure we want it on every deploy — could cause noisy `lastmod` churn from formatter-only commits.)
- [ ] **OG image audit** — verify every share image is 1200×630 PNG, under 8 MB, served over HTTPS, with `og:image:secure_url` set.

### GSC/Bing setup commands

```sh
# 1. Get the TXT record from GSC, then:
#    Vercel dashboard → Domains → thetrackerapp.io → DNS Records → Add TXT
#    Host: @  Value: google-site-verification=…

# 2. After DNS propagates (~5 min on Vercel):
#    GSC → Add property → Domain → thetrackerapp.io → Verify

# 3. Submit sitemap (GSC):
#    Sitemaps → Add new sitemap → "sitemap.xml" → Submit

# 4. Bing:
#    bing.com/webmasters → Add a site → Import from Google Search Console
```

---

## Phase 1 — Week 1 (Jun 6 → Jun 12): KEYWORD-LOCK + SLUG ARCHITECTURE

- [ ] Lock winning phrase per page from `SEO_KEYWORDS.md`.
- [ ] Decide which 6–10 cross-product slugs ship in Phase 2 (the highest volume:difficulty entries from the matrix). Don't ship all 36.
- [ ] H1 + `<title>` + meta description templates for every page (channel × vertical).
- [ ] 301-redirect plan in `vercel.json` for any renamed routes (preserve link equity).
- [ ] Add `scripts/validate-routes.mjs` — verifies every entry in `PUBLIC_ROUTES` has a unique H1 + title + meta description in the corresponding HTML file. Fails the build if any are missing or duplicated.

### Slug pattern (locked)

```
Channel landing       → /imessage, /sms, /telegram, /discord, /whatsapp, /signal
Vertical landing      → /calorie-tracker, /workout-log, /nutrition-tracker, /water-tracker, /step-counter
Cross-product (top 6) → /imessage-calorie-tracker
                        /telegram-workout-log
                        /sms-water-tracker
                        /discord-nutrition-bot
                        /whatsapp-calorie-counter
                        /signal-hydration-tracker
```

---

## Phase 2 — Week 2 (Jun 13 → Jun 19): SCHEMA LAYER A (global)

- [ ] Upgrade homepage `Organization` block:
  - `address` → `PostalAddress` with `addressLocality`, `addressRegion`, `addressCountry`.
  - `sameAs` → every social + Telegram + Discord invite.
  - `contactPoint` → one per support channel.
- [ ] Add `WebSite` schema with `SearchAction` (sitelinks search box eligibility).
- [ ] Build reusable `<BreadcrumbList />` snippet, drop into every non-home page.
- [ ] **Validate every block** in Rich Results Test. Zero errors, zero warnings. Then deploy.

---

## Phase 3 — Week 3 (Jun 20 → Jun 26): SCHEMA LAYER B (per-page)

| Page type | Required schema types |
|---|---|
| Channel landing pages | `SoftwareApplication` + `FAQPage` + `HowTo` (the "text this to log X" flow) |
| Vertical landing pages | `SoftwareApplication` + `FAQPage` + `HowTo` |
| Cross-product pages | `SoftwareApplication` + `FAQPage` + `HowTo` |
| `/tools/tdee-calculator`, `/tools/bmi-calculator` | `WebApplication` + `HowTo` + `FAQPage` |
| `/tools/food-diary`, `/tools/ai-meal-planner` | `WebApplication` + `FAQPage` |
| `/pricing` | `Product` with `Offer` per tier + `AggregateRating` |
| `/community` | `FAQPage` |
| `/personal-trainers`, `/run-clubs` | `Service` (Ronald's Layer B exactly), `provider` → Org |
| `/leaderboard`, `/brackets` | `ItemList` with live entries (rendered server-side or pre-rendered) |
| `/blog` index | `Blog` |
| Individual blog posts | `Article` with `author`, `datePublished`, `dateModified` |

- [ ] Build `scripts/validate-schema.mjs` — extracts every JSON-LD block from `dist/`, POSTs to Rich Results Test (or runs `schema-dts` type checks locally). Fails build on any error.

---

## Phase 4 — Week 4 (Jun 27 → Jul 3): CONTENT VELOCITY — anchor articles

Write 6 cornerstone posts, 1,500–2,500 words each, each targeting one top-volume phrase from `SEO_KEYWORDS.md`. Each post: `Article` schema, internal links to matching landing page + matching tool, FAQ block (= `FAQPage` schema), free-tool CTA.

Working titles:
1. **How to track calories over iMessage (no app needed)**
2. **The easiest way to log workouts via SMS in 2026**
3. **Telegram fitness bots compared — which one actually works?**
4. **Hydration tracking by text: a guide for people who forget**
5. **Discord workout bots: setup + the 3 worth using**
6. **WhatsApp calorie counter: track meals from any phone**

---

## Phase 5 — Weeks 5–6 (Jul 4 → Jul 17): TOOLS EXPANSION

Tools rank fast and pull qualified, high-intent traffic. Each new tool: client-side compute, no auth, `WebApplication` + `HowTo` + `FAQPage` schema, internal link from `/tools/` index + matching landing page + matching blog post.

- [ ] `/tools/calorie-calculator` — Mifflin-St Jeor
- [ ] `/tools/macro-calculator`
- [ ] `/tools/water-intake-calculator`
- [ ] `/tools/one-rep-max-calculator` — Epley, Brzycki, Lombardi
- [ ] `/tools/body-fat-calculator` — Navy method
- [ ] `/tools/pace-calculator`
- [ ] `/tools/calories-burned-calculator` — MET-based, exercise dropdown
- [ ] `/tools/` index page listing every tool with `ItemList` schema.

---

## Phase 6 — Weeks 7–8 (Jul 18 → Jul 31): AEO + INTERNAL LINKING

The new SERP isn't ten blue links — it's ChatGPT, Claude, Perplexity, Gemini, and Bing Copilot citing sources. `llms.txt` exists already; we expand it into a structured catalog.

- [ ] **Expand `public/llms.txt`** — every page, every endpoint, every concept, with one-paragraph factual answers. Format follows the emerging llms.txt convention (`# H1` per topic, short paragraphs, no marketing copy).
- [ ] **Add `/api/llms.json`** — same content as JSON for programmatic crawlers. Cache-Control: `public, max-age=3600`.
- [ ] **In-page FAQ on every landing page** (separate from blog posts). UX win + `FAQPage` schema win.
- [ ] **Internal linking audit** — every landing page must link to: (a) homepage, (b) 2 sibling landing pages, (c) 1 tool, (d) 1 blog post. Build `scripts/link-graph.mjs` to verify; fail CI on orphans.

---

## Phase 7 — Month 3 (Aug 1 → Aug 31): AUTHORITY + BACKLINKS

| Channel | Action | Frequency |
|---|---|---|
| Product Hunt | Relaunch with angle "now via Signal + WhatsApp" | 1 launch |
| BetaList | Submit | 1 |
| AlternativeTo | List as alternative to MyFitnessPal, Cronometer, Lose It | 3 listings |
| SaaSHub, GetApp, Capterra | List | 3 listings |
| Guest posts | Fitness blogs, angle "tracking without another app" | 5 outreach/wk |
| HARO / Qwoted / Featured.com | Answer reporter queries from fitness journalists | 3/wk |
| Reddit | r/loseit, r/fitness, r/xxfitness, r/telegram — answer questions where text-based tracking is a genuine fit. Signature link only, no spam. | Daily, light touch |
| Repurposing | Each cornerstone post → X thread, LinkedIn post, YouTube short demoing the flow inside iMessage | 1 per post |

---

## Phase 8 — Month 4 (Sep 1 → Sep 30): REFRESH + DOUBLE DOWN

By now GSC has 60+ days of impression data. Standard refresh cycle:

1. **Impressions but no clicks** → rewrite `<title>` + meta description. Test for 2 weeks.
2. **Page 2 of SERP** → expand content, add 2 internal links from higher-traffic pages, bump `dateModified`.
3. **Clicks but high bounce** → fix above-the-fold UX. Page intent mismatch is the usual culprit.
4. **Re-run Keyword Planner** — Ronald's step 1.5: search behavior shifts. Lock new winners. Loop Phase 1–3 for any new high-value phrases.

---

## Recurring weekly checklist (every Friday)

- [ ] GSC Performance report — flag any page that lost >20% impressions WoW.
- [ ] GSC Coverage report — fix any new "Excluded" or "Error" URLs.
- [ ] GSC Enhancements — verify zero new schema warnings.
- [ ] PageSpeed Insights on homepage + top 3 traffic pages — Core Web Vitals green.
- [ ] One new blog post (1,500+ words, schema, internal links).
- [ ] One new free tool, OR one tool refresh.
- [ ] One backlink earned (or 5 outreach emails sent).
- [ ] `npm run sitemap:build` if any new page shipped.

---

## Anti-patterns we will NOT do

- **Keyword stuffing** in `<meta name="keywords">` — Google ignores it; Bing barely uses it. Current implementation in `index.html:11` is harmless but not load-bearing. Don't add it to new pages.
- **AI-generated thin content.** Every blog post gets a real human pass. AI drafts fine; AI ship-as-is is what gets you the Helpful Content penalty.
- **Doorway pages.** The 6 channel pages and 5 vertical pages must each have genuinely different content, not template-swapped boilerplate. Google's spam team flags this.
- **Lying changefreq.** `<changefreq>always</changefreq>` on a static page is a known soft-spam signal. Our generator only emits real values.
- **Schema we can't validate.** Ronald's rule. If it doesn't pass Rich Results Test, it doesn't ship.
- **Buying links.** Period.

---

## Open questions to resolve next session

1. Do we want `prebuild` to auto-rebuild sitemap on every Vercel deploy, or only on explicit `npm run sitemap:build`? (Trade-off: freshness vs. `lastmod` churn from formatter commits.)
2. Where do channel landing pages live in nav? Adding 6 top-level links bloats the header. Options: (a) dropdown, (b) only show on `/community` + footer, (c) only discoverable via SEO + internal links.
3. Brand position on hreflang — do we ever ship localized variants (es-MX, pt-BR, de-DE)? If yes, plan slugs and `hreflang` tags now, not later.
4. `dashboard.thetrackerapp.io` — currently blocked from indexing. Confirm we never want a public marketing surface on the subdomain (e.g. `/dashboard/preview` for demo purposes).
