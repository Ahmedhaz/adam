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
- `enhance/features.js` holds the added gameplay systems; App.js pulls it in
  with `// @include features.js`
- `enhance/economy.js` is the money model: costs that grow with the company,
  "default alive" instead of infinite runway, valuation as ARR × multiple,
  market cycles, shocks and difficulty modes. It wraps the engine's
  `recalculate` and `advanceWeek`, and is included the same way
- `enhance/market.js` is product-market fit: a hidden fit score that scales
  every revenue gain, customer talks and insight cards, experiments, pivots,
  competitors and per-sector rules
- `enhance/org.js` is people and capital: hires with jobs and a ramp-up,
  culture, term sheets that close after due diligence, revenue-based
  financing, a grant, angel bridges, the board and the co-founder
- `enhance/build.py` applies small patches to the game engine and wraps the
  page for mobile (PWA head, safe areas)

```bash
python3 founder-fog-app/enhance/build.py   # rebuild ../founder-fog/index.html and ar.html
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

### Look (v4, BitLife-style)
Bright theme (patched into the shared theme module so every screen follows),
3D Fluent emoji pictures bundled in `../founder-fog/img/` (`enhance/pics.json`
maps emoji → file; drawn via CSS on `[data-pic]`), a header with your avatar
and a mood face that follows your clarity, "this week" tiles, a life-log feed,
BitLife stat bars and a round **+1 Week** button. Avatar is picked at setup.

### Arabic version
`../founder-fog/ar.html` is the same game in Arabic, right-to-left, with IBM Plex
Sans Arabic embedded. The title screen has an English / العربية switch; the
choice is remembered, and first launch follows the device language.

- `enhance/ar.json` maps `"<module>|<English string>"` → Arabic (`null` = code,
  leave as is). `enhance/translate.mjs` extracts candidate strings from the
  bundle and swaps them in at build time
- `enhance/ar-translation-guide.md` has the glossary and rules for adding or
  editing translations
- After changing any visible text, re-run extraction to find new strings:
  `node enhance/translate.mjs extract <bundle.js> cands.json`, then add the
  missing keys to `ar.json` and rebuild

### Gameplay systems (v3)
- **Inbox:** 1–2 short messages every week (customers, co-founder, investors,
  family). Swipe or tap to decide; some messages punish being ignored
- **Fundraising:** pitch an angel, seed fund or top-tier VC. Answer three
  questions scored against your real numbers, then sign the term sheet or
  push for 30% more. Costs equity and your weekly action; one round per stage
- **Founder levels:** XP now levels you up; pick one of three perks each level
- **Target streaks:** consecutive weekly targets pay cash and clarity bonuses

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
