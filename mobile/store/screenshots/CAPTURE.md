# Capturing Listing Screenshots

The screenshots live in `mobile/store/screenshots/` once captured. This file documents the exact procedure so anyone can produce them deterministically.

## Prerequisites (one-time)

```bash
# Xcode 16+ with iOS Simulator runtimes installed
xcode-select --install
sudo xcodebuild -runFirstLaunch
# Download iOS 18 simulator runtime:
xcodebuild -downloadPlatform iOS

# Android Studio + the Pixel 8 system image
# (or just install platform-tools for adb headlessly)
brew install --cask android-platform-tools
```

Verify:

```bash
xcrun simctl list devices available | grep "iPhone 16 Pro Max"   # must exist
adb --version                                                     # must print a version
```

## Boot the simulators

```bash
# iPhone 16 Pro Max (1320×2868 — the size Apple requires)
xcrun simctl boot "iPhone 16 Pro Max"
open -a Simulator

# Pixel 8 Pro (1344×2992 native; we'll downscale to 1080×2400 for Play)
# Use Android Studio AVD Manager → run "Pixel 8 Pro API 34"
```

## Run the app pointed at production data

```bash
cd mobile
npx expo start
# Press 'i' to open in iOS sim, 'a' to open in Android emulator
```

Sign in with the test account credentials (any phone/email/username that has at least 7 days of logged data so Stats has real numbers).

## Capture sequence — same 5 frames per platform

1. **Stats tab** with non-zero values: workouts ≥ 3, calories ≥ 12,000, water ≥ 7. Scroll to top.
2. **Account tab**, scrolled to top, with email/phone filled.
3. **Sheet tab**, default state.
4. **Billing tab** with an active subscription showing.
5. **Login screen** (sign out first) with phone field empty.

### iOS capture

In the Simulator, with the target frame on screen: **⌘S** saves a 1320×2868 PNG to `~/Desktop`. Rename and move:

```bash
mv ~/Desktop/Simulator\ Screen\ Shot*.png mobile/store/screenshots/ios/01-stats.png
# ...etc per frame
```

Or via CLI (no GUI dialog):

```bash
mkdir -p mobile/store/screenshots/ios
xcrun simctl io booted screenshot mobile/store/screenshots/ios/01-stats.png
xcrun simctl io booted screenshot mobile/store/screenshots/ios/02-account.png
xcrun simctl io booted screenshot mobile/store/screenshots/ios/03-sheet.png
xcrun simctl io booted screenshot mobile/store/screenshots/ios/04-billing.png
xcrun simctl io booted screenshot mobile/store/screenshots/ios/05-login.png
```

### Android capture

```bash
mkdir -p mobile/store/screenshots/android
adb shell screencap -p /sdcard/01-stats.png && adb pull /sdcard/01-stats.png mobile/store/screenshots/android/
adb shell screencap -p /sdcard/02-account.png && adb pull /sdcard/02-account.png mobile/store/screenshots/android/
adb shell screencap -p /sdcard/03-sheet.png && adb pull /sdcard/03-sheet.png mobile/store/screenshots/android/
adb shell screencap -p /sdcard/04-billing.png && adb pull /sdcard/04-billing.png mobile/store/screenshots/android/
adb shell screencap -p /sdcard/05-login.png && adb pull /sdcard/05-login.png mobile/store/screenshots/android/
```

Then resize the Android frames to the Play-Console target if your emulator is higher-resolution:

```bash
# requires `brew install imagemagick`
for f in mobile/store/screenshots/android/*.png; do
  magick "$f" -resize 1080x2400 "$f"
done
```

## iPad screenshots (required because `supportsTablet: true`)

```bash
xcrun simctl boot "iPad Pro 13-inch (M4)"
# repeat capture sequence → mobile/store/screenshots/ipad/
```

Target size: 2064×2752 portrait.

## Captioning (optional but recommended)

Apple and Google do not render captions separately — you bake them into the PNG before upload. Easiest workflow:

1. Open the captured PNG in Figma / Sketch / Pixelmator.
2. Add a colored banner above the device frame with the caption text from `mobile/store/listings.md` § "Screenshot order".
3. Export 1:1 at the original pixel size.

Or skip captions entirely. Plain device screenshots are fully acceptable on both stores; you just lose the per-frame messaging that some apps use for differentiation.

## Output structure expected

```
mobile/store/screenshots/
├── ios/
│   ├── 01-stats.png       (1320×2868)
│   ├── 02-account.png
│   ├── 03-sheet.png
│   ├── 04-billing.png
│   └── 05-login.png
├── ipad/
│   ├── 01-stats.png       (2064×2752)
│   └── ...
└── android/
    ├── 01-stats.png       (1080×2400)
    └── ...
```

## When you're done

Upload through:
- **App Store Connect** → your app → Version → Media Manager → drag iOS files into "iPhone 6.9-inch Display" + iPad files into "iPad 13-inch Display".
- **Play Console** → your app → Store presence → Main store listing → drag Android files into "Phone screenshots".
