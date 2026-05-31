# Automation Manifest

`selectors.json` is the source of truth for any smoke-test bot that drives
thetrackerapp.io. It exposes:

1. The CSS selector for every interactive element on the marketing page,
   `/login`, `/authorize`, and the dashboard SPA.
2. Named **journeys** (`marketing-page-smoke`, `login-request-code`,
   `login-verify-otp`, `dashboard-tab-traversal`, `external-link-billing`,
   `external-link-google-sheet`, etc.) that the bot can execute end-to-end.
3. The env vars the bot needs to authenticate.

It is tool-agnostic: write a thin runner in Playwright, Puppeteer, Selenium,
or plain `fetch` and feed it the JSON.

## Files

| File | Purpose |
| --- | --- |
| `selectors.json` | The manifest. Keep this in sync whenever a selector changes. |
| `README.md` | This file. |

## Updating

When you add, remove, or rename an interactive element in `index.html`,
`login.html`, `authorize.html`, or `dashboard.html`:

1. Give the element a stable `id` (preferred) or a `data-*` attribute.
2. Add/update its entry under the matching `pages.<page>.elements` section
   in `selectors.json`.
3. If the element is part of a user journey (login, billing, etc.), update
   the relevant entry in the `journeys` array as well.
4. Bump `version` in the manifest if the change is breaking for consumers.

## Selector conventions used in the site

- `#navAccount`, `#navStats`, ... `#navAffiliate` for every sidebar tab.
- `#tabAccount`, `#tabStats`, ... `#tabAffiliate` for every panel container.
- `[data-tab="..."]` on each tab button (kept in sync with the IDs).
- `[data-range="day|week|month|year|all"]` on the stats range buttons.
- `[data-days="1..7"]` on the workout plan day toggles.
- `[data-prompt="..."]` on the AI quick-prompt buttons.
- All external links the bot validates expose `target="_blank"` and a
  populated `href`: `#sheetDatabaseLink`, `#billingManageLink`,
  `#affiliateAgreementLink`, `#statsSheetLink`, `#leaderboardLink`.

## Backend bypass required for authenticated journeys

The two journeys `login-verify-otp` and everything tagged `"auth": "required"`
need a deterministic OTP. Production login otherwise round-trips an 8-char
code via SMS / email / Telegram, which a CI bot cannot read.

**The backend must implement one of these (pick one and document the choice
in `BACKEND_REQUIREMENTS.txt`):**

- **Option A — header bypass.** When the request includes
  `x-tracker-test: <shared-secret>` AND the credential matches a known test
  account, `/api/auth/request-code` skips the real send and
  `/api/auth/verify` accepts a fixed OTP read from env (e.g.
  `TRACKER_TEST_OTP`).
- **Option B — debug endpoint.** A non-public endpoint
  `POST /api/internal/test-otp { credential }` that returns the current code
  for a known test account. Gated by an internal-only token.
- **Option C — fixed test account.** A dedicated phone/email whose code is
  always the same string. Simplest but lowest security; only acceptable if
  the account has zero financial scope.

Until one of these exists, the bot should run only the `auth: "none"`
journeys (`marketing-page-smoke`, `login-request-code`) and validate that
the request-code call returns 200 without proceeding to verify.

## Env the bot reads

```
TRACKER_TEST_CREDENTIAL=+15551234567       # phone, email, or @handle
TRACKER_TEST_OTP=ABCD1234                  # only meaningful with backend bypass
TRACKER_TEST_MODE_HEADER=x-tracker-test:1  # optional, see Option A above
```

## Example consumer (Playwright sketch)

```js
import { test, expect } from '@playwright/test';
import manifest from '../automation/selectors.json' assert { type: 'json' };

const sel = (page, key) => manifest.pages[page].elements[key].selector;

test('marketing smoke', async ({ page }) => {
  await page.goto(manifest.meta.marketingBaseUrl);
  await expect(page.locator(sel('marketing', 'loginLink'))).toBeVisible();
  await expect(page.locator(sel('marketing', 'signupSubmitButton'))).toBeVisible();
});
```

The same pattern works for every journey in `selectors.json` \u2014 the bot just
needs an interpreter for the small `actions` vocabulary documented at the
bottom of the manifest.
