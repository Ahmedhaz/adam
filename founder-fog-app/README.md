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

## Changing the game
`../founder-fog/index.html` is **generated**, so don't edit it by hand. The
original game only exists as the compiled Expo web build of the Founder Fog
artifact (`enhance/original.html`); the React Native source wasn't found in
any repo. Enhancements are applied on top of it:

- `enhance/App.js` replaces the game shell and HQ screen (Metro module 144)
- `enhance/Onboarding.js` replaces the title screen and new-company setup (module 265)
- `enhance/build.py` applies small patches to the game engine and wraps the
  page for mobile (PWA head, safe areas)

```bash
python3 founder-fog-app/enhance/build.py   # rebuild ../founder-fog/index.html
cd founder-fog-app && npx cap sync         # copy into the native projects
```

### Design (v2 revamp)
- **Title screen** with Continue / New company, then a 2-step setup: pick a
  market (cash, margin, runway at a glance) and name the company, with a
  "how a week works" primer
- **HQ** is the home tab: runway hero with month pips, MRR/burn/users,
  clarity and morale meters, the weekly target as a quest card, your weekly
  action, the next funding milestone and the latest journal entries
- **Weekly report** after every *End week*: cash/MRR/clarity/morale deltas,
  warnings (fog, short runway, resignations, stage-ups) and what's next
- **Dilemmas and strategies** show their trade-offs as green/red chips
- **The fog is visible**: a drifting, blurring haze over the money numbers
  and a vignette around the screen that thicken as clarity drops
- Icon tab bar with attention dots, a pulsing *End week* button when there's
  nothing left to do, and motion that respects reduced-motion settings

### What the enhanced version changes
- **Autosave:** progress is saved after every move; on launch you get
  *Continue* / *Discard*
- **Feedback:** every action shows a toast; failed actions now say why
  (not enough cash, action already used) instead of silently doing nothing,
  and each week ends with a summary (cash, MRR, clarity, morale)
- **More room on small screens:** the four stats sit in one row, and the
  weekly target card collapses
- **No free target claims:** the *Complete target* button handed out EXP and
  cash without doing anything. A target is now completed by executing one of
  its strategies, once per week
- **The fog actually rolls in:** clarity drains each week (−2, more when
  runway is under 6 or 3 months or morale is under 40), so resting through
  *Actions* matters and the burnout ending can happen
- Rounded cash in the weekly log, a dot on *Actions* when the weekly action
  is unused, and larger tap targets
