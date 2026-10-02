# Founder Fog — teaching content brief (Phase 5)

Read `BRIEF.md` in this folder first for the game, the voice, the Arabic glossary and the no-template-strings rule. This brief adds the teaching layer: after every dilemma, a **mentor note**; across runs, a collectable **Founder Playbook**.

The mentor is a startup operator and author with 20 years of experience. A note must teach something the player can use on Monday, in plain words, without moralising and without telling them they chose "wrong" (there is no right option). Real books, essays and well-known public frameworks may be cited by title and author. Real companies may be mentioned only as widely-known public history (e.g. "Slack started as a game company"), stated accurately and without claims you're unsure of; when in doubt, describe the pattern without naming a company.

## Playbook page ids (use exactly these)

default_alive, runway, burn_multiple, unit_economics, churn, pmf, mom_test, experiments, pivot, do_things, pricing, channels, vanity, hire_slow, culture, no_jerks, vesting, cofounder, delegation, term_sheet, liq_pref, board, dilution, alt_funding, fundraise_timing, investor_updates, transparency, security, tech_debt, custom_work, burnout, family, ethics, crisis, mena_regulation, mena_payments, mena_seasons, mena_wasta, expansion, exits

## Skills (for the end-of-run report card)

discovery (learning from customers), frugality (spending discipline), hiring (people and culture), fundraising (capital and control), selfcare (health and relationships), integrity (honesty with customers, team and investors).

## Notes pack format

File `notes_<x>.js`, body is one statement, indented two spaces:
```js
  const NOTES_PRODUCT = {
    dl_prod_01: {
      lesson: "A customer who pays for a custom feature is buying your roadmap. Price it like that, or say no.",
      example: "Many B2B startups that said yes to their biggest logo ended up maintaining a product for one customer.",
      read: "The Hard Thing About Hard Things, Ben Horowitz",
      page: "custom_work",
      skills: { A: { discovery: -1 }, B: { discovery: 1, frugality: 1 } },
    },
    // one entry per dilemma id
  };
```
- `lesson` ≤ 160 chars: the one sentence to remember.
- `example` ≤ 180 chars: a concrete real-world pattern or case.
- `read` ≤ 80 chars: "Title, Author" (book, essay or framework). It is shown as-is in both languages, so leave it out of the Arabic file.
- `page`: one playbook page id from the list (the page this dilemma unlocks).
- `skills`: for option A and option B, 0–2 skills each with value 1 or -1 (what the choice shows about the founder). Use {} when an option says nothing about a skill. Don't make one option all +1 and the other all -1 every time: trade-offs show in different skills.
- The Arabic file `notes_<x>.ar.json` maps every `lesson` and `example` string to Arabic (not `read`).

## Playbook pack format (only the playbook writer)

File `playbook.js`:
```js
  const PLAYBOOK = [
    { id: "default_alive", icon: "🌱", title: "Default alive", body: "...", source: "Paul Graham, Default Alive or Default Dead? (2015)" },
    // 40 pages, in the id order above
  ];
  const GLOSSARY = [
    { term: "MRR", def: "Monthly recurring revenue: what customers pay you every month, without one-off sales." },
    // MRR, ARR, Burn, Runway, Churn, CAC, LTV, ARPU, Product-market fit, Dilution, Valuation, Liquidation preference, Vesting, Default alive, Tech debt
  ];
  const SKILL_ADVICE = {
    discovery: ["...", "..."],   // 2 lines each: what a veteran would have done differently if this skill was weak
    frugality: [...], hiring: [...], fundraising: [...], selfcare: [...], integrity: [...],
  };
  const END_LESSONS = {
    bank: "...", burn: "...", exit: "...", board: "...", cofounder: "...", alone: "...", challenge: "...", challenge_failed: "...",
  };
```
- Page `body` 250–450 chars: the idea, why it matters, and one thing to do. `title` ≤ 40. `icon` one emoji from BRIEF.md's list. `source` ≤ 90 (not translated).
- Glossary `def` ≤ 140. Glossary `term` IS translated.
- SKILL_ADVICE lines ≤ 150 each. END_LESSONS ≤ 170 each: one sentence a veteran would say about that ending.
- Arabic file `playbook.ar.json` maps every title, body, term, def, advice line and lesson to Arabic (not `source`, not ids).

## Validate

From `/home/user/adam`: `node founder-fog-app/enhance/content/check_teach.mjs founder-fog-app/enhance/content/<file>.js` until it prints OK. Don't edit other files, don't commit. Reply with counts and 3 example lessons.
