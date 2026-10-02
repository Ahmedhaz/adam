// Validates a content pack: node content/check.mjs content/<pack>.js
// A pack is a JS file whose body is `  const NAME = [ ... ];` (it is inlined into App.js).
// Its Arabic lives next to it in <pack>.ar.json: { "<English string>": "<Arabic string>" }.
import fs from "fs";
import path from "path";
const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const name = (src.match(/const\s+([A-Z_0-9]+)\s*=/) || [])[1];
if (!name) throw new Error("expected `const NAME = [...]`");
const s = { week: 20, monthlyRevenue: 8000, cash: 40000, team: [1, 2, 3], stage: 2, mentalClarity: 50, teamMorale: 60, churnRate: 5, techDebt: 30, investorTrust: 70, activeUsers: 900, arpu: 30, sector: { id: "saas_ai" }, mkt: { pmf: 35 }, org: { board: null, culture: 60 }, equity: 80, mode: "venture", relationships: [] };
const list = new Function("s", src + "\nreturn " + name + ";")(s);
const FX = new Set(["cash", "mrrPct", "users", "churn", "morale", "clarity", "techDebt", "trust", "arpu", "pmf", "culture", "cofounder", "boardTrust", "equity", "baseBurn", "family", "partner", "xp"]);
const ICON = /^\p{Extended_Pictographic}/u;
const errors = [];
const strings = new Set();
const str = (v, where, max) => {
  if (typeof v !== "string" || !v.trim()) return errors.push(where + ": missing text");
  if (/\$\{|`/.test(v)) errors.push(where + ": no template syntax allowed");
  if (max && v.length > max) errors.push(where + `: too long (${v.length} > ${max})`);
  strings.add(v);
};
const fxCheck = (fx, where) => {
  if (!fx || typeof fx !== "object") return errors.push(where + ": fx missing");
  for (const k of Object.keys(fx)) {
    if (!FX.has(k)) errors.push(where + ": unknown fx key " + k);
    if (typeof fx[k] !== "number" || !isFinite(fx[k])) errors.push(where + ": fx " + k + " must be a number");
  }
  if (!Object.keys(fx).length) errors.push(where + ": fx is empty");
};
const ids = new Set();
let echoes = 0;
if (list[0] && list[0].kind === "mail") {
  list.forEach((c, i) => {
    const w = c.id || "#" + i;
    if (!c.id || ids.has(c.id)) errors.push(w + ": id missing or duplicate");
    ids.add(c.id);
    str(c.from, w + ".from", 60); str(c.title, w + ".title", 80); str(c.body, w + ".body", 160);
    for (const side of ["left", "right"]) { str(c[side] && c[side].label, w + "." + side + ".label", 34); if (c[side]) { str(c[side].log, w + "." + side + ".log", 170); c[side].fx && fxCheck(c[side].fx, w + "." + side); } }
    if (c.ignore) { str(c.ignore.log, w + ".ignore.log", 170); fxCheck(c.ignore.fx, w + ".ignore"); }
    if (c.when && typeof c.when !== "function") errors.push(w + ": when must be a function");
  });
} else {
  list.forEach((d, i) => {
    const w = d.id || "#" + i;
    if (!d.id || ids.has(d.id)) errors.push(w + ": id missing or duplicate");
    ids.add(d.id);
    str(d.cat, w + ".cat", 28);
    if (!ICON.test(d.icon || "")) errors.push(w + ": icon must be one emoji");
    str(d.title, w + ".title", 70);
    str(d.desc, w + ".desc", 260);
    if (d.when && typeof d.when !== "function") errors.push(w + ": when must be a function");
    if (d.when) try { d.when(s); } catch (e) { errors.push(w + ": when() throws: " + e.message); }
    for (const k of ["A", "B"]) {
      const o = d[k];
      if (!o) { errors.push(w + ": option " + k + " missing"); continue; }
      str(o.title, w + "." + k + ".title", 60);
      str(o.log, w + "." + k + ".log", 200);
      fxCheck(o.fx, w + "." + k);
      if (o.echo) {
        echoes++;
        const e = o.echo;
        if (!Array.isArray(e.after) || e.after.length !== 2 || e.after[0] < 4 || e.after[1] > 30 || e.after[0] > e.after[1]) errors.push(w + "." + k + ".echo.after must be [min,max] weeks within 4..30");
        if (!ICON.test(e.icon || "")) errors.push(w + "." + k + ".echo.icon must be one emoji");
        str(e.title, w + "." + k + ".echo.title", 60);
        str(e.text, w + "." + k + ".echo.text", 220);
        fxCheck(e.fx, w + "." + k + ".echo");
      }
    }
  });
}
const arPath = file.replace(/\.js$/, ".ar.json");
if (!fs.existsSync(arPath)) errors.push("missing " + path.basename(arPath));
else {
  const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));
  for (const t of strings) {
    if (!(t in ar)) errors.push("no Arabic for: " + t.slice(0, 60));
    else if (!/[؀-ۿ]/.test(ar[t])) errors.push("Arabic looks empty for: " + t.slice(0, 60));
    else {
      const nums = (x) => (x.match(/\d[\d,.]*/g) || []).join("|");
      if (nums(t) !== nums(ar[t])) errors.push("numbers differ in Arabic for: " + t.slice(0, 60));
    }
  }
}
console.log(`${name}: ${list.length} items, ${echoes} echoes, ${strings.size} strings`);
if (errors.length) { console.log("ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("OK");
