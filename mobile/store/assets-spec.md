# Store Assets — Exact Specs

What you (or a designer) need to produce. All sizes are hard requirements; the stores reject anything off-spec.

---

## App Icons

| Asset | Size | Format | Notes |
| --- | --- | --- | --- |
| **Master icon** | 1024 × 1024 | PNG, no alpha, no rounded corners, sRGB | Apple applies the mask automatically. Used by Expo to generate every other variant. |
| iOS marketing icon | 1024 × 1024 | PNG, no alpha | Same file as master. Goes in App Store Connect. |
| Android adaptive icon foreground | 432 × 432 (in 108×108 dp safe zone) | PNG, transparent bg | The "logo" layer. Edges may be clipped. |
| Android adaptive icon background | 432 × 432 | PNG | Flat background. The brand teal `#021416` is a safe default. |
| Android monochrome icon (themed icon, Android 13+) | 432 × 432 | PNG, alpha | White silhouette on transparent. |
| Web favicon | 32 × 32 | PNG | Used by Expo web preview only. |

Workflow once you have a master 1024×1024 PNG:

```bash
cd mobile
npx expo-cli generate --platform all       # legacy
# or simpler: just replace the source files and let Expo regenerate
# Replace these files with your branded versions:
#   mobile/assets/images/icon.png                       (1024x1024)
#   mobile/assets/images/android-icon-foreground.png    (432x432, logo only)
#   mobile/assets/images/android-icon-background.png    (432x432, flat)
#   mobile/assets/images/android-icon-monochrome.png    (432x432, white silhouette)
#   mobile/assets/images/splash-icon.png                (logo for splash)
```

---

## Apple App Store screenshots

Apple now requires only ONE iPhone size if you support all-screen modern devices:

| Device class | Size | Required | Notes |
| --- | --- | --- | --- |
| **iPhone 6.9"** (iPhone 16 Pro Max) | **1320 × 2868** portrait | **YES — required** | This single set is shown for every iPhone size. |
| iPhone 6.5" (legacy fallback) | 1242 × 2688 | optional | Only needed if you want pixel-perfect art on older devices. |
| iPad 13" (M4) | 2064 × 2752 | required only if you ship iPad | We have `supportsTablet: true` in app.json so YES. |
| iPad 12.9" (Gen 6) | 2048 × 2732 | optional | |

Minimum: 3 screenshots per device class. Maximum: 10. We recommend 5.

**Screenshot order + caption suggestions** (the caption gets baked into the image you upload; Apple does not render it separately):

| # | Screen to capture | Caption |
| --- | --- | --- |
| 1 | Stats tab with real numbers | "Your last 7 days at a glance" |
| 2 | Account tab | "Everything we know about you in one place" |
| 3 | Sheet tab | "One tap to your Google Sheet" |
| 4 | Billing tab | "Manage your subscription — Stripe secure" |
| 5 | Login screen | "Sign in with phone, email, or @username" |

---

## Google Play screenshots & graphics

| Asset | Size | Required | Notes |
| --- | --- | --- | --- |
| **App icon** | 512 × 512 | required | PNG, alpha allowed, 32-bit. |
| **Feature graphic** | 1024 × 500 | required | Banner shown above the listing. Big visual + minimal text. |
| **Phone screenshots** | 1080 × 1920 or higher, aspect 9:16 to 9:19.5 | min 2, max 8 | We'll do 5, same shots as iOS. |
| 7" tablet screenshots | 1200 × 1920 | optional | Skip for v1. |
| 10" tablet screenshots | 1920 × 1200 | optional | Skip for v1. |
| Promo video | YouTube URL | optional | Skip for v1. |

---

## Recommended workflow

1. Run the app on an iPhone 16 Pro Max simulator (`npm run ios` then pick the device).
2. Use Simulator → File → New Screenshot (⌘S) — produces native 1320×2868 PNGs.
3. Run the same flow on a Pixel 8 emulator for 1080×2400 Android shots; downscale to 1080×1920 for Play.
4. Drop screenshots through a captioning template (Figma works; one frame per shot). Bake the caption into the image.
5. Upload to App Store Connect → "Media Manager" and Play Console → "Store listing → Phone".

---

## Splash screen

Currently using the Expo placeholder. Replace:

- `mobile/assets/images/splash-icon.png` — just the logo, transparent background
- `mobile/app.json` → `plugins[expo-splash-screen].backgroundColor` is `#021416` (deep ink) which matches our app theme. Update there if you change brand colors.

Expo will composite the logo over the background color at the right size for every device automatically.

---

## Asset checklist before first submission

- [ ] 1024×1024 master icon (no alpha, no rounded corners)
- [ ] Android adaptive icon foreground 432×432
- [ ] Android adaptive icon monochrome 432×432
- [ ] Splash icon (transparent bg)
- [ ] 5 × iPhone 6.9" screenshots (1320×2868)
- [ ] 5 × iPad 13" screenshots (2064×2752) — only because we support tablets
- [ ] 5 × Android phone screenshots (1080×1920+)
- [ ] 1024×500 Google Play feature graphic
- [ ] 512×512 Google Play icon
