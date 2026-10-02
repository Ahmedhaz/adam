# Founder Fog — content pack brief (Phase 4)

Founder Fog is a mobile startup-survival game (English + Arabic, players aged 18–39, many in the Middle East / Gulf / Egypt). The player runs a startup week by week. Every ~3 weeks a **dilemma** card appears: a title, a 1–3 sentence situation, and two options (A and B). There is never a right answer: both options must be defensible, and each must cost something. A senior startup mentor (20 years, author of startup books) is the editorial voice: honest, specific, a little dry, never preachy, never cartoonish.

Recurring characters you may use: **Tariq Mansour** (technical co-founder, CTO), **Layla Fahmy** (lead angel investor), **Omar Sabry** (key customer), **Northwind Retail** (big customer), **Nour** (the founder's partner), the founder's **mother** and **father**. Invent other people with names common in the Arab world (and occasionally elsewhere). No real companies, brands or real people. The founder is gender-neutral: never use he/she for the player; address them as "you".

## File format (strict)

Write two files in `founder-fog-app/enhance/content/`:

1. `<pack>.js` — the body is ONE statement, indented two spaces, exactly like:
```js
  const DL_PRODUCT = [
    {
      id: "dl_prod_01",
      cat: "Product",
      icon: "🛠️",
      title: "Your biggest customer wants a custom feature",
      desc: "Northwind Retail will sign a 12-month contract if you build their reporting module first. It's six weeks of work nobody else has asked for.",
      when: (s) => s.monthlyRevenue >= 3000,
      A: { title: "Build it and sign the contract", fx: { mrrPct: 0.12, techDebt: 6, pmf: -3 }, log: "The contract is signed. The roadmap now has a customer's name on it.",
           echo: { after: [10, 18], icon: "🕳", title: "The custom module needs a team", text: "Northwind keeps asking for changes to the module only they use. Two engineers now spend every Friday on it.", fx: { techDebt: 8, morale: -6 } } },
      B: { title: "Decline and stay on the roadmap", fx: { mrrPct: -0.03, pmf: 3, trust: -3 }, log: "Northwind was disappointed. Your roadmap is still yours." },
    },
    // ...
  ];
```
2. `<pack>.ar.json` — a flat JSON object mapping **every** English string in the pack (cat, title, desc, option titles, logs, echo titles, echo texts; for mail packs also from/title/body/labels/logs) to its Arabic: `{ "Product": "المنتج", "Your biggest customer wants a custom feature": "...", ... }`. Identical English strings appear once.

Rules:
- Plain double-quoted strings only. No template literals, no `${}`, no backticks, no string concatenation, no functions other than `when`.
- `when` is optional: `(s) => <boolean expression>` using only: `s.week` (1..80), `s.monthlyRevenue` ($), `s.cash`, `s.team.length` (starts at 2), `s.stage` (1 pre-seed, 2 seed, 3 series A, 4 unicorn), `s.mentalClarity` (0–100), `s.teamMorale` (0–100), `s.churnRate` (% per month, ~5), `s.techDebt` (0–100), `s.investorTrust` (0–100), `s.activeUsers`, `s.sector.id` (one of `saas_ai`, `fintech`, `ecommerce_marketplace`, `healthtech`, `edtech`), `s.mkt.pmf` (product-market fit 0–100, 40 = fit), `s.org.board` (null until there is a board), `s.equity` (founder %), `s.mode`. Keep conditions simple and safe.
- `icon` must be ONE emoji from this list (these have 3D artwork): ⚡ 💼 👥 🤝 ⭐ 🔥 🚀 🎓 📈 📨 🚪 ⚖ 💰 🏢 📊 👼 🏆 🛡 🌱 💻 🏦 🏃 🧾 ⚠ 🏛 🌫 🧠 🔄 🦄 🔋 🦈 ☣ 💥 🩺 🔍 📓 📧 🐦 🎪 📰 📱 ☁ 📡 🕵 🧓 🧘 🧲 🌧 🫶 🌅 🧪 🔭 🐳 🤩 🙂 😬 😐 📝 🎉 ⏳ 🧊 📭 🛠 🔒 💸 ✅ 🚨 🕳 📉 🧩 ⚔ 🏷 🤖 💳 🛍 ⛰ 😎 😵‍💫 🥴 😮‍💨 🤯 📅 💵 ❤ 🏠 👔 🎲 💡 🎯 🏔
- `fx` keys (numbers only) and sensible ranges:
  - `cash` absolute dollars (−15000..+30000; most choices −500..−6000)
  - `mrrPct` fraction of current monthly revenue (−0.2..+0.2; e.g. 0.08 = +8% MRR)
  - `users` active users (−400..+1500)
  - `churn` monthly churn percentage points (−1.5..+2)
  - `morale` team morale points (−20..+20)
  - `clarity` founder mental clarity points (−20..+20)
  - `techDebt` (−20..+20)
  - `trust` investor trust (−20..+15)
  - `arpu` revenue per user $ (−5..+8)
  - `pmf` product-market fit points (−8..+8)
  - `culture` team culture (−12..+8)
  - `cofounder` relationship with Tariq (−20..+20)
  - `boardTrust` (−15..+10, only meaningful when a board exists)
  - `equity` founder ownership percentage points (−5..+2)
  - `baseBurn` monthly fixed cost $ change (−800..+1500)
  - `family`, `partner` relationship health (−20..+20)
  - `xp` founder experience (10..120)
- Balance: each option has at least one cost AND one benefit. Avoid one option strictly dominating. Effects should be modest: dilemmas flavour the run, they don't decide it.
- **Delayed consequences ("echoes")**: at least 40% of dilemmas must have an `echo` on one option (sometimes both). An echo is the consequence coming back `after: [min, max]` weeks later (4..30; most 8–25). Echo `text` must make the link obvious without saying "because you chose X" (the game adds "Your decision in week N." itself). Echoes can be good (patience paying off) as well as bad. Echo fx follow the same keys and ranges.
- Lengths: title ≤ 70 chars, desc ≤ 260, option title ≤ 60, log ≤ 200, echo title ≤ 60, echo text ≤ 220. Option titles are imperative and short ("Ship it Friday", "Tell the team the truth").
- `cat` is the category label shown on the card (short, ≤ 28 chars), one per section as assigned.
- Write like a person who has been in the room: concrete numbers, names, small details (a 2am Slack message, a WhatsApp voice note, a term sheet clause). No clichés like "synergy" or "disrupt". No moralising in logs: logs say what happened.
- Ids: lowercase, prefix given in your assignment, numbered `_01`, `_02`, ...

## Arabic

Write the Arabic as a native Arabic-speaking startup person would say it, in Modern Standard Arabic that reads naturally to Gulf and Egyptian readers — not a word-for-word translation. Keep names transliterated consistently: Tariq = طارق, Layla Fahmy = ليلى فهمي, Omar Sabry = عمر صبري, Northwind Retail = نورثويند للتجزئة, Nour = نور. Glossary (use these): MRR = الإيراد الشهري, churn = التسرّب, runway = مدة الصمود, burn = الحرق, tech debt = الدين التقني, product-market fit = التوافق مع السوق, board = مجلس الإدارة, co-founder = الشريك المؤسس, investor = مستثمر, term sheet = ورقة الشروط, equity/stake = الحصة, valuation = التقييم, customer = عميل, team morale = معنويات الفريق, clarity = الوضوح. **Every number in the English string must appear identically in the Arabic** (Western digits, same formatting: "$4,000" stays "$4,000", "12-month" → "12 شهرًا"). The validator checks this.

## Validate

Run `node founder-fog-app/enhance/content/check.mjs founder-fog-app/enhance/content/<pack>.js` from the repo root (`/home/user/adam`) and fix every error until it prints OK. Do not edit any other file in the repo. Do not commit. When done, reply with the pack name, item count, echo count, and 3 example titles.
