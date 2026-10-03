# Founder Fog — industry packs brief

Read `BRIEF.md` (the game, the voice, the fx keys, the emoji list, the Arabic glossary, the no-template-strings rule) and `BRIEF_TEACH.md` (mentor notes) in this folder first. Everything there applies here.

## Why this pack exists

Founder Fog lets the player found a company in one of five industries. Today almost all content is generic: a fintech founder and a bootcamp founder read the same dilemmas, mail and weekly targets. Real founders in these industries live different lives. Your job is to write **one industry's** pack so a player of that industry feels, every few weeks, "this is exactly what running this kind of company is like" — and learns the industry's real lessons.

You are writing as a startup mentor with 20 years of operating and investing experience across the Middle East and beyond. Be specific to the industry: its unit economics, its regulators, its customers, its failure modes, its jargon (explained through situations, never lectured). If a dilemma would work unchanged in another industry, it is not specific enough.

## The five industries (as the game defines them)

All start at week 1 with two people (the founder and **Tariq Mansour**, technical co-founder) and the recurring cast from BRIEF.md. The player's company is in the Gulf/Egypt/Levant region.

1. **saas_ai** (short id `saas`) — *B2B Enterprise AI & Workflow SaaS*: builds AI agents that plug into companies' systems to automate customer service, data entry and financial/operational reporting. Sells per-seat subscriptions ($99–$499/user/month) plus usage packages for enterprises. Starts with $25,000, 85% gross margin. Game rule: churn settles 1% lower. Rivals: Flowly, Nimbus AI, Taskr. Customers are "enterprise accounts"; channel is outbound sales and developer communities.
   Real life: long sales cycles, pilots/POCs that never convert, procurement and security questionnaires, InfoSec reviews and data-processing agreements, the champion who leaves, seat vs usage pricing, LLM inference costs eating gross margin, dependency on one model provider (price change, outage, deprecation), hallucinations in front of a client, customers asking whether their data trains the model, on-prem/private-cloud demands, net revenue retention and expansion, implementation services creeping into a "software" company, Arabic-language model quality.

2. **fintech** (short id `fin`) — *Fintech & API Payment Gateway*: APIs for shops and apps to accept payments and instant transfers (cards, wallets, open banking). Earns 1.5–2.5% + $0.30 per successful transaction plus a fraud-detection licence fee. Starts with $40,000, 70% gross margin, compliance costs $800/month. Game rule: almost no growth until the central bank licence lands (somewhere between weeks 8 and 14; `s.mkt.licensed` becomes true). Rivals: PayNest, Dinar Labs, Sahm Pay. Customers are "merchant accounts"; channel is partner banks and developer API docs.
   Real life: licence conditions and minimum capital, the sponsor/partner bank who can switch you off, KYC/KYB onboarding friction vs conversion, AML alerts and suspicious transaction reports, chargebacks and fraud rings, high-risk merchants who pay well (gaming, crypto, gray-area sellers), settlement timing and float, PCI-DSS audits, card-scheme rules, take rate compression when a big merchant negotiates, merchant concentration risk, outages during payday or White Friday, reconciliation errors, the compliance officer you must hire before you need them.

3. **ecommerce_marketplace** (short id `mkt`) — *D2C E-Commerce & Curated Marketplace*: connects local and exclusive brands with shoppers, with warehousing, packing and 24-hour delivery. Earns product margins plus a 15% commission on partner sellers' orders. Starts with $18,000, 48% gross margin, heavy reliance on paid acquisition. Game rule: chicken and egg — growth is slow until $5k MRR, then the network kicks in. Rivals: Bazaarist, Souqly, DealDrop. Customers are "repeat buyers"; channel is paid social and creator partnerships; the promise is 24-hour delivery.
   Real life: liquidity (enough sellers for buyers and vice versa), supply quality and curation, disintermediation (buyer and seller meet once, then trade on WhatsApp), take rate vs seller churn, cash on delivery and returns (rejected COD parcels), contribution margin per order after delivery, packaging and returns, inventory risk if you own stock, couriers and the 24-hour promise, seasonality (Ramadan, Eid, White Friday, back to school), counterfeit or copied products from a seller, a seller who becomes your competitor, paid social CAC inflation, influencer economics, repeat purchase rate as the real north star.

4. **healthtech** (short id `health`) — *HealthTech & Remote Telehealth Clinic*: an app connecting patients with accredited consultants, plus home monitoring devices for blood pressure and diabetes. Earns $35–$90 per video consultation and $49/employee/month care packages for companies. Starts with $35,000, 65% gross margin. Game rule: trust builds slowly — growth runs 15% slower, churn settles 1.5% lower. Rivals: Dr. Now, CareLink, Shifa Go. Customers are "patients on recurring care plans"; channel is clinic referrals and corporate wellness deals; the asset is the remote monitoring integration.
   Real life: licensed doctors and their schedules (supply), clinical governance and malpractice insurance, who pays (patient, employer, insurer) and slow insurer reimbursement, health-ministry licensing and e-prescription rules, patient data privacy and where it's stored, clinical evidence before hospitals or insurers buy, an adverse event or missed diagnosis, device supply and calibration, adherence (patients stop measuring), doctors who want equity or leave for a hospital, employer wellness deals with low engagement, the pull to add "AI diagnosis" before it's safe.

5. **edtech** (short id `edu`) — *EdTech & Career Acceleration Academy*: intensive bootcamps (software engineering, AI) with job placement at global companies. Earns $1,200–$2,800 per programme, or income-share agreements (12% of salary after hiring), plus $29/month content subscriptions. Starts with $20,000, 78% gross margin. Game rule: seasons — back-to-school weeks grow 40% faster, summer 30% slower; churn settles 1% higher. Rivals: CodeCamp+, SkillUp Arabia, LearnLite. Customers are "enrolled students"; channel is alumni referrals and employer placement partners; the asset is the placement guarantee.
   Real life: outcomes are the product (placement rate, salary uplift), completion rates, cohort economics and the next cohort's start date, instructor quality and instructor poaching, curriculum going stale in six months, employer hiring freezes breaking the placement promise, income-share agreements and collections, refund demands, parents as payers and decision makers, accreditation and certificates, government upskilling programmes and their paperwork, inflated placement statistics in the market, content piracy, corporate training as a B2B second business.

## What to write (four files, in this folder)

Replace `<short>` with your industry's short id and `<SHORT>` with it in capitals (SAAS, FIN, MKT, HEALTH, EDU).

### 1. `dl_<short>.js` + `dl_<short>.ar.json` — 8 dilemmas, `const DL_<SHORT> = [...]`
Exactly the format and rules of BRIEF.md (ids `dl_<short>_01`…`_08`, `cat` labels specific to the industry such as "Compliance", "Sellers", "Clinical", "Outcomes", "Enterprise sales"). Every `when` MUST start with `s.sector.id === "<industry id>"` (e.g. `(s) => s.sector.id === "fintech" && s.week >= 6`). Spread them across the run: 2 that can appear early (week 3–10), 4 mid-game (revenue/team conditions), 2 later (stage ≥ 2 or week ≥ 20). At least 4 of the 8 have an echo. Use the recurring cast where it fits and invent industry people (a compliance officer, a head of supply, a medical director, a lead instructor…).

### 2. `notes_<short>.js` + `notes_<short>.ar.json` — 8 mentor notes, `const NOTES_<SHORT> = {...}`
One per dilemma id, exactly BRIEF_TEACH.md's notes format. `page` may be any existing page id from BRIEF_TEACH.md, or your industry page `sector_<short>`; use `sector_<short>` for at least 3 of the 8. `read`: real, well-known books/essays relevant to the industry (only ones you are sure exist, with the right author).

### 3. `mail_<short>.js` + `mail_<short>.ar.json` — 4 inbox messages, `const MAIL_<SHORT> = [...]`
Exactly the mail format in `mail.js` (look at it): `kind: "mail"`, `id: "mx_<short>_01"`…, `from` (emoji + name · role), `title`, `body`, `left` and `right` choices (`label`, optional `fx`, `log`), optional `ignore` (what happens if the player never answers; use it on 1–2 messages that punish silence). Every message needs `when: (s) => s.sector.id === "<industry id>" && ...`. Mix: 1 industry noise to learn to ignore (a vendor pitch that sounds essential), 3 real ones (a regulator, a key partner, a customer). Same fx keys as dilemmas.

### 4. `sector_<short>.js` + `sector_<short>.ar.json` — `const SECTOR_<SHORT> = {...}`
```js
  const SECTOR_SAAS = {
    sector: "saas_ai",
    // role labels for the two key relationships every company starts with:
    // c1 is the organisation "Northwind Retail", c2 is the person "Omar Sabry"
    roles: { c1: "Enterprise client", c2: "Design partner" },
    // what talking to customers reveals in this industry (≤ 120 chars, in a customer's or your team's words)
    insights: [
      { area: "onboarding", text: "..." }, // 6 items, areas from: onboarding, pricing, feature, channel, support (cover at least 4)
    ],
    // two industry experiments the player can run for $1,500
    experiments: [
      { id: "xs_saas_01", area: "pricing", title: "Charge per task instead of per seat", win: { arpu: 6, pmf: 4 }, winText: "...", lose: { churn: 0.4, pmf: 1 }, loseText: "..." },
    ],
    // five weekly targets that only this industry gets
    targets: [
      {
        id: "st_saas_01", urgency: 55, once: true,
        when: (s) => s.sector.id === "saas_ai" && s.monthlyRevenue > 2000,
        title: "🔐 This Week: Pass the Security Review",
        tasks: "• Their InfoSec team sent 180 questions | • The deal waits on your answers",
        why: "...", // 120–300 chars: why this matters in this industry
        strategies: [
          { path: "bootstrap", title: "1. ...", desc: "...", cost: 0, tab: "Journal", fx: { mentalClarity: -8, monthlyRevenue: 900 }, log: "..." },
          { path: "capital", title: "2. ...", desc: "...", cost: 2500, tab: "Assets", fx: { ... }, log: "..." },
          { path: "defensive", title: "3. ...", desc: "...", cost: 0, tab: "Departments", fx: { ... }, log: "..." },
        ],
      },
    ],
    // one industry challenge for the Challenges screen
    challenge: { id: "sc_saas", icon: "🏢", name: "...", goal: "...", mode: "venture", deadline: 30, done: (s) => s.monthlyRevenue >= 10000 && s.churnRate <= 4 },
    // one Founder Playbook page about this industry
    page: { id: "sector_saas", icon: "🤖", title: "...", body: "...", source: "Title, Author (year)" },
  };
```
Rules for this file:
- `experiments` fx keys: `arpu` ($), `churn` (points, + is worse), `cacPct` (fraction, −0.2 = 20% cheaper acquisition), `users`, `clarity`, `techDebt`, `trust`, `pmf` (fit points: win 2–7, lose 0–2). Titles ≤ 50, texts ≤ 130. An experiment is a two-week test of one hypothesis.
- `targets`: ids `st_<short>_01`…`_05`; `urgency` 38–70 (crises 60–70, opportunities 40–55); `once: true` for milestones that should happen once per company, `false` for recurring situations (then make `when` include something like `s.week % 7 == 3` so it doesn't repeat every week). `when` uses the same state fields as dilemmas plus `s.mkt.licensed` (fintech), `s.defaultAlive`, `s.valuation`. Spread them: 2 early (weeks 3–12), 2 mid, 1 late. `title` "<one emoji> This Week: ..." ≤ 70; `tasks` "• ... | • ..." ≤ 110; each strategy title starts with "1. ", "2. ", "3. " and is ≤ 64; `desc` ≤ 150; `log` ≤ 170 (what happened, no moralising); `path` one of bootstrap / capital / bold / defensive; `tab` one of Journal / Assets / Departments / Relationships.
  Target fx keys (engine fields): `mentalClarity`, `teamMorale` (points), `techDebt`, `activeUsers`, `monthlyRevenue` ($ gained per month, at seed-stage scale: 200–2500; the game scales it up by stage and caps it), `investorTrust`, `churnRate` (points, negative is better, −2..+1), `cash` ($, scaled by stage), `cac`, `arpu`. `cost` is in dollars at pre-seed scale (0–5000, scaled up later). Each strategy must have a cost and a benefit; make them real trade-offs (cheap but slow, expensive but fast, safe but small, bold but risky).
- `challenge`: `name` ≤ 40, `goal` ≤ 130 (one sentence, measurable, the player must understand exactly what to reach), `deadline` 12–40 weeks, `mode` one of venture / bootstrapped / winter / hard, `done(s)` uses only state fields listed above and must be reachable but hard (ask yourself: could a careful player do it in the deadline?).
- `page`: `id` exactly `sector_<short>`, `title` ≤ 40, `body` 250–450 chars (the industry's one big truth, why it matters, one thing to do this week), `source` ≤ 90, a real book/essay/framework.
- `roles`: ≤ 26 chars each, what Northwind Retail (an organisation) and Omar Sabry (a person) are to a company in this industry (e.g. fintech: "Top merchant", "Merchant · founder").
- Arabic file: every English string in the file (role labels, insight texts, experiment title/texts, target title/tasks/why/strategy title/desc/log, challenge name/goal, page title/body) → Arabic. Not `source`, not ids, not icons. Numbers identical.

## Quality bar

- Each dilemma: both options defensible, each costs something, effects modest, 1–3 sentences of situation with a concrete detail (an amount, a clause, a name, a deadline, a time of day).
- Echoes make the industry's slow consequences visible (the chargeback that arrives 6 weeks later, the cohort that doesn't get placed, the patient complaint that reaches the ministry).
- No real companies or people (well-known public history in mentor `example` lines is fine, stated accurately). Gender-neutral founder ("you").
- Write the Arabic like a native startup person in the region, not a word-for-word translation; use the glossary.

## Validate

From `/home/user/adam`:
```
node founder-fog-app/enhance/content/check.mjs founder-fog-app/enhance/content/dl_<short>.js
node founder-fog-app/enhance/content/check.mjs founder-fog-app/enhance/content/mail_<short>.js
node founder-fog-app/enhance/content/check_teach.mjs founder-fog-app/enhance/content/notes_<short>.js
node founder-fog-app/enhance/content/check_sector.mjs founder-fog-app/enhance/content/sector_<short>.js
```
Fix every error until all four print OK. Write only your eight files; don't edit any other file and don't commit. Reply with: counts, the 8 dilemma titles, the 5 target titles, the challenge goal, and one paragraph on what makes your industry's content distinct.
