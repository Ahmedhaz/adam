// Validates an industry pack: node content/check_sector.mjs content/sector_<x>.js
// The file body is `  const SECTOR_<X> = { ... };` (inlined into App.js and the target generator).
// Its Arabic lives next to it in sector_<x>.ar.json: { "<English string>": "<Arabic string>" }.
import fs from "fs";
import path from "path";
const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const name = (src.match(/const\s+(SECTOR_[A-Z_0-9]+)\s*=/) || [])[1];
if (!name) throw new Error("expected `const SECTOR_<X> = {...}`");
const pack = new Function(src + "\nreturn " + name + ";")();
const SECTORS = ["saas_ai", "fintech", "ecommerce_marketplace", "healthtech", "edtech"];
const AREAS = ["onboarding", "pricing", "feature", "channel", "support"];
const PATHS = ["bootstrap", "capital", "bold", "defensive"];
const TABS = ["Journal", "Assets", "Departments", "Relationships"];
const MODES = ["venture", "bootstrapped", "winter", "hard"];
const XFX = new Set(["arpu", "churn", "cacPct", "users", "clarity", "techDebt", "trust", "pmf"]);
const TFX = new Set(["mentalClarity", "teamMorale", "techDebt", "activeUsers", "monthlyRevenue", "investorTrust", "churnRate", "cash", "cac", "arpu"]);
const PAGES = new Set("default_alive runway burn_multiple unit_economics churn pmf mom_test experiments pivot do_things pricing channels vanity hire_slow culture no_jerks vesting cofounder delegation term_sheet liq_pref board dilution alt_funding fundraise_timing investor_updates transparency security tech_debt custom_work burnout family ethics crisis mena_regulation mena_payments mena_seasons mena_wasta expansion exits".split(" "));
const errors = [], strings = new Set();
const str = (v, where, max, min) => {
  if (typeof v !== "string" || !v.trim()) return errors.push(where + ": missing text");
  if (/\$\{|`/.test(v)) errors.push(where + ": no template syntax allowed");
  if (max && v.length > max) errors.push(where + `: too long (${v.length} > ${max})`);
  if (min && v.length < min) errors.push(where + `: too short (${v.length} < ${min})`);
  strings.add(v);
};
const fxCheck = (fx, keys, where, allowEmpty) => {
  if (!fx || typeof fx !== "object") return errors.push(where + ": fx missing");
  for (const k of Object.keys(fx)) {
    if (!keys.has(k)) errors.push(where + ": unknown fx key " + k);
    if (typeof fx[k] !== "number" || !isFinite(fx[k])) errors.push(where + ": fx " + k + " must be a number");
  }
  if (!allowEmpty && !Object.keys(fx).length) errors.push(where + ": fx is empty");
};
const fn = (f, where) => {
  if (typeof f !== "function") return errors.push(where + ": must be (s) => boolean");
  const probe = { week: 20, monthlyRevenue: 8000, cash: 40000, team: [1, 2, 3], stage: 2, mentalClarity: 50, teamMorale: 60, churnRate: 5, techDebt: 30, investorTrust: 70, activeUsers: 900, arpu: 30, sector: { id: pack.sector }, mkt: { pmf: 35, licensed: true }, org: { board: null }, equity: 80, mode: "venture", defaultAlive: false, valuation: 1500000 };
  try {
    const r = f(probe);
    if (typeof r !== "boolean") errors.push(where + ": must return true or false");
  } catch (e) {
    errors.push(where + ": throws " + e.message);
  }
  if (!/sector\.id\s*===\s*"/.test(String(f)) && where.startsWith("targets")) errors.push(where + ": when must check s.sector.id");
};
const ids = new Set();
const id = (v, prefix, where) => {
  if (typeof v !== "string" || !v.startsWith(prefix)) errors.push(where + `: id must start with ${prefix}`);
  if (ids.has(v)) errors.push(where + ": duplicate id " + v);
  ids.add(v);
};

if (!SECTORS.includes(pack.sector)) errors.push("sector must be one of " + SECTORS.join(", "));
const short = { saas_ai: "saas", fintech: "fin", ecommerce_marketplace: "mkt", healthtech: "health", edtech: "edu" }[pack.sector] || "x";

// roles
if (!pack.roles) errors.push("roles missing");
else ["c1", "c2"].forEach((k) => str(pack.roles[k], "roles." + k, 26));

// insights
if (!Array.isArray(pack.insights) || pack.insights.length !== 6) errors.push("insights: exactly 6");
(pack.insights || []).forEach((x, i) => {
  if (!AREAS.includes(x.area)) errors.push(`insights[${i}]: area must be one of ${AREAS.join(", ")}`);
  str(x.text, `insights[${i}].text`, 120);
});
if (new Set((pack.insights || []).map((x) => x.area)).size < 4) errors.push("insights: cover at least 4 different areas");

// experiments
if (!Array.isArray(pack.experiments) || pack.experiments.length !== 2) errors.push("experiments: exactly 2");
(pack.experiments || []).forEach((x, i) => {
  const w = `experiments[${i}]`;
  id(x.id, "xs_" + short + "_", w);
  if (!AREAS.includes(x.area)) errors.push(w + ": bad area");
  str(x.title, w + ".title", 50);
  str(x.winText, w + ".winText", 130);
  str(x.loseText, w + ".loseText", 130);
  fxCheck(x.win, XFX, w + ".win");
  fxCheck(x.lose, XFX, w + ".lose", true);
  if (!x.win || !(x.win.pmf >= 2 && x.win.pmf <= 7)) errors.push(w + ".win.pmf must be 2..7");
  if (x.lose && x.lose.pmf != null && !(x.lose.pmf >= 0 && x.lose.pmf <= 2)) errors.push(w + ".lose.pmf must be 0..2");
});

// targets
if (!Array.isArray(pack.targets) || pack.targets.length !== 5) errors.push("targets: exactly 5");
(pack.targets || []).forEach((t, i) => {
  const w = `targets[${i}]`;
  id(t.id, "st_" + short + "_", w);
  if (!(t.urgency >= 38 && t.urgency <= 70)) errors.push(w + ".urgency must be 38..70");
  fn(t.when, w + ".when");
  str(t.title, w + ".title", 70);
  if (!/^\S+ This Week: /u.test(t.title || "")) errors.push(w + '.title must look like "<emoji> This Week: ..."');
  str(t.tasks, w + ".tasks", 110);
  if (!/^• .+ \| • .+/.test(t.tasks || "")) errors.push(w + '.tasks must look like "• ... | • ..."');
  str(t.why, w + ".why", 300, 120);
  if (typeof t.once !== "boolean") errors.push(w + ".once must be true or false");
  if (!Array.isArray(t.strategies) || t.strategies.length !== 3) errors.push(w + ": exactly 3 strategies");
  (t.strategies || []).forEach((o, j) => {
    const v = `${w}.strategies[${j}]`;
    if (!PATHS.includes(o.path)) errors.push(v + ".path must be one of " + PATHS.join(", "));
    if (!TABS.includes(o.tab)) errors.push(v + ".tab must be one of " + TABS.join(", "));
    str(o.title, v + ".title", 64);
    if (!new RegExp("^" + (j + 1) + "\\. ").test(o.title || "")) errors.push(v + `.title must start with "${j + 1}. "`);
    str(o.desc, v + ".desc", 150);
    str(o.log, v + ".log", 170);
    if (!(Number.isInteger(o.cost) && o.cost >= 0 && o.cost <= 5000)) errors.push(v + ".cost must be an integer 0..5000");
    fxCheck(o.fx, TFX, v + ".fx");
  });
});

// challenge
const c = pack.challenge || {};
id(c.id, "sc_" + short, "challenge");
str(c.icon, "challenge.icon", 4);
str(c.name, "challenge.name", 40);
str(c.goal, "challenge.goal", 130);
if (!MODES.includes(c.mode)) errors.push("challenge.mode must be one of " + MODES.join(", "));
if (!(Number.isInteger(c.deadline) && c.deadline >= 12 && c.deadline <= 40)) errors.push("challenge.deadline must be 12..40");
fn(c.done, "challenge.done");

// playbook page
const pg = pack.page || {};
if (pg.id !== "sector_" + short) errors.push(`page.id must be sector_${short}`);
str(pg.icon, "page.icon", 4);
str(pg.title, "page.title", 40);
str(pg.body, "page.body", 450, 250);
if (typeof pg.source !== "string" || pg.source.length > 90) errors.push("page.source: ≤ 90 chars");

// Arabic
const arFile = file.replace(/\.js$/, ".ar.json");
if (!fs.existsSync(arFile)) errors.push("missing " + path.basename(arFile));
else {
  const ar = JSON.parse(fs.readFileSync(arFile, "utf8"));
  [...strings].filter((s) => s !== pg.source && !/^\p{Extended_Pictographic}/u.test(s) || s.length > 4).forEach((s) => {
    if (s === pg.source) return;
    if (/^\p{Extended_Pictographic}️?$/u.test(s)) return;
    if (!ar[s]) errors.push("Arabic missing: " + s.slice(0, 60));
    else if (!/[؀-ۿ]/.test(ar[s])) errors.push("Arabic not Arabic: " + s.slice(0, 60));
  });
}
if (errors.length) {
  console.log(errors.length + " problem(s):\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`OK ${name}: 6 insights, 2 experiments, 5 targets, challenge, page; ${strings.size} strings translated`);
