# Founder Fog — mobile app

Founder Fog (the startup survival game) packaged as a mobile app, two ways.

## 1. Install from the web (PWA), no store needed
The game lives in [`/founder-fog`](../founder-fog) and is served at
`https://adam.ahmedhaz.com/founder-fog/` once this branch is on `main`.

- **iPhone:** open it in Safari → Share → *Add to Home Screen*
- **Android:** open it in Chrome → ⋮ → *Install app*

It opens full screen with its own icon and works offline.

## 2. Native Android / iOS app (Capacitor)
This folder wraps the same `../founder-fog` build in a native shell
(`com.ahmedhaz.founderfog`).

**Android APK, no setup:** every push that touches the game runs the
*Founder Fog · Android APK* GitHub Action. Open the run → *Artifacts* →
download `founder-fog-apk`, unzip, and install `app-debug.apk` on the phone
(allow "install unknown apps").

**Locally:**
```bash
cd founder-fog-app
npm install
npm run apk        # Android debug APK (needs Android SDK)
npm run android    # open in Android Studio
npm run ios        # open in Xcode (macOS, run `pod install` in ios/App first)
```

After changing anything in `../founder-fog`, run `npx cap sync`.
Icons and splash screens come from `assets/icon.png`
(`npx @capacitor/assets generate`).

## Notes
- `index.html` is the compiled Expo web build of the Founder Fog artifact;
  the original React Native source wasn't found in the repos, so edits to
  gameplay need that source.
- The game doesn't save progress between sessions; closing the app restarts it.
