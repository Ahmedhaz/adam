// Validates a teaching pack: node content/check_teach.mjs content/notes_x.js | content/playbook.js
import fs from "fs";
const file = process.argv[2];
const src = fs.readFileSync(file, "utf8");
const names = [...src.matchAll(/^\s*const\s+([A-Z_0-9]+)\s*=/gm)].map((m) => m[1]);
const vals = new Function(src + "\nreturn {" + names.join(",") + "};")();
const PAGES = "default_alive runway burn_multiple unit_economics churn pmf mom_test experiments pivot do_things pricing channels vanity hire_slow culture no_jerks vesting cofounder delegation term_sheet liq_pref board dilution alt_funding fundraise_timing investor_updates transparency security tech_debt custom_work burnout family ethics crisis mena_regulation mena_payments mena_seasons mena_wasta expansion exits".split(" ");
const SKILLS = ["discovery", "frugality", "hiring", "fundraising", "selfcare", "integrity"];
const errors = [], strings = new Set();
const str = (v, w, max, tr = true) => {
  if (typeof v !== "string" || !v.trim()) return errors.push(w + ": missing");
  if (/\$\{|`/.test(v)) errors.push(w + ": no template syntax");
  if (max && v.length > max) errors.push(w + `: too long (${v.length} > ${max})`);
  if (tr) strings.add(v);
};
const ICON = /^\p{Extended_Pictographic}/u;
for (const n of names) {
  const v = vals[n];
  if (n.startsWith("NOTES_")) {
    const ids = Object.keys(v);
    for (const id of ids) {
      const x = v[id], w = n + "." + id;
      str(x.lesson, w + ".lesson", 160); str(x.example, w + ".example", 180); str(x.read, w + ".read", 80, false);
      if (!PAGES.includes(x.page) && !/^sector_(saas|fin|mkt|health|edu)$/.test(x.page)) errors.push(w + ": unknown page " + x.page);
      for (const k of ["A", "B"]) {
        const sk = (x.skills || {})[k];
        if (!sk || typeof sk !== "object") { errors.push(w + ": skills." + k + " missing"); continue; }
        for (const s in sk) { if (!SKILLS.includes(s)) errors.push(w + ": unknown skill " + s); if (sk[s] !== 1 && sk[s] !== -1) errors.push(w + ": skill values must be 1 or -1"); }
        if (Object.keys(sk).length > 2) errors.push(w + ": max 2 skills per option");
      }
    }
    if (process.argv[3]) {
      const want = process.argv.slice(3);
      for (const id of want) if (!ids.includes(id)) errors.push("missing note for " + id);
    }
    console.log(n + ": " + ids.length + " notes");
  } else if (n === "PLAYBOOK") {
    if (v.map((p) => p.id).join(" ") !== PAGES.join(" ")) errors.push("PLAYBOOK must have the 40 ids in order");
    v.forEach((p) => { const w = "page." + p.id; if (!ICON.test(p.icon || "")) errors.push(w + ": icon"); str(p.title, w + ".title", 40); str(p.body, w + ".body", 450); if (p.body && p.body.length < 250) errors.push(w + ": body too short"); str(p.source, w + ".source", 90, false); });
    console.log("PLAYBOOK: " + v.length + " pages");
  } else if (n === "GLOSSARY") {
    v.forEach((g, i) => { str(g.term, "glossary." + i + ".term", 30); str(g.def, "glossary." + i + ".def", 140); });
    if (v.length < 15) errors.push("GLOSSARY needs 15 terms");
  } else if (n === "SKILL_ADVICE") {
    SKILLS.forEach((k) => { if (!Array.isArray(v[k]) || v[k].length !== 2) errors.push("SKILL_ADVICE." + k + " needs 2 lines"); (v[k] || []).forEach((l, i) => str(l, "advice." + k + i, 150)); });
  } else if (n === "END_LESSONS") {
    ["bank", "burn", "exit", "board", "cofounder", "alone", "challenge", "challenge_failed"].forEach((k) => str(v[k], "end." + k, 170));
  }
}
const arPath = file.replace(/\.js$/, ".ar.json");
if (!fs.existsSync(arPath)) errors.push("missing " + arPath);
else {
  const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));
  const nums = (x) => (x.match(/\d[\d,.]*/g) || []).join("|");
  for (const t of strings) {
    if (!(t in ar)) errors.push("no Arabic for: " + t.slice(0, 60));
    else if (!/[؀-ۿ]/.test(ar[t])) errors.push("Arabic looks empty for: " + t.slice(0, 60));
    else if (nums(t) !== nums(ar[t])) errors.push("numbers differ in Arabic for: " + t.slice(0, 60));
  }
}
if (errors.length) { console.log("ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("OK");
