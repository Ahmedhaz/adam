// Founder Fog i18n: extract user-visible strings from bundle modules, or
// replace them with translations.
//
//   node translate.mjs extract <bundle.js> <out.json>
//   node translate.mjs apply   <bundle.js> <dict.json> <out.js>
//
// A "module" is one Metro __d(function(...){...},ID,[deps]) block. Only the
// modules listed in MODULES are touched. Keys are "<module>|<text>" where text
// is a string literal's value or a template literal's raw body (${...} kept).
import fs from "fs";
import * as acorn from "acorn";

const MODULES = [144, 263, 264, 265, 270, 295, 296, 297, 298, 299, 301, 302, 303];
const [, , mode, bundlePath, a2, a3] = process.argv;
const bundle = fs.readFileSync(bundlePath, "utf8");

function findModule(id) {
  const end = bundle.indexOf("}," + id + ",[");
  if (end < 0) throw new Error("module " + id + " not found");
  const start = bundle.lastIndexOf("__d(", end);
  return { start: start + 4, end: end + 1 }; // the function expression
}

// Strings that are obviously code, never UI.
const CODE = /^(#[0-9a-f]{3,8}|rgba?\(.*\)|[A-Za-z]+_[0-9]{3}[A-Za-z]+|use strict|__esModule|default|[a-z][a-zA-Z0-9]*|[a-z0-9_]+|[A-Z_0-9]+|data:.*|https?:.*|[\d.%\s]+(deg|px)?)$/;
// Lowercase single words are normally code; these few are on-screen labels in our own screens.
const LABEL_WORDS = new Set(["users", "used", "margin", "runway", "mo",
  "MRR", "RUNWAY", "MORALE", "LATELY", "INTEREST", "HQ", "FOUNDER", "EXP", "CONTINUE", "COMPANY", "CLARITY", "CASH", "CAC", "ARPU",
  "BANK", "CONSEQUENCE", "MENTOR", "WK", "FRACTURED", "SOUND", "ACTIVE", "CANDIDATES", "ROSTER", "UNPAID", "DIFFICULTY", "VALUATION"]);

// Right-to-left text reorders "+$3,500" into "3,500$+". Wrapping each run of
// signs/currency/digits/placeholders in a left-to-right isolate keeps it intact.
const LRI = "\u2066",
  PDI = "\u2069";
const isolatePlain = (t) => t.replace(/[+\-\u2212]?\$?\d[\d,.]*[%kKM]?\$?/g, (m) => (/[+\-\u2212$%]/.test(m) ? LRI + m + PDI : m));
const isolateTemplate = (t) =>
  t.replace(/(?:\$\{[^{}]*\}|[+\-\u2212$%]|\d[\d,.]*[kKM]?)+/g, (m) => {
    const bare = m.replace(/\$\{[^{}]*\}/g, "");
    return /[+\-\u2212$%]/.test(bare) && (/\d|\$\{/.test(m)) ? LRI + m + PDI : m;
  });
const ISOLATE = process.argv.includes("--isolate-numbers");
function candidates(src, offset) {
  const ast = acorn.parse("(" + src + ")", { ecmaVersion: "latest", ranges: false });
  const out = [];
  const walk = (node, parent) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "Literal" && typeof node.value === "string") {
      const v = node.value;
      const isKey = parent && parent.type === "Property" && parent.key === node && !parent.computed;
      if (!isKey && /[A-Za-z]/.test(v) && (!CODE.test(v) || LABEL_WORDS.has(v))) out.push({ kind: "s", text: v, start: node.start - 1 + offset, end: node.end - 1 + offset });
    } else if (node.type === "TemplateLiteral") {
      // node offsets are +1 because of the "(" wrapper; the body sits between the backticks
      const inner = src.slice(node.start, node.end - 2);
      if (/[A-Za-z]{2}/.test(inner.replace(/\$\{[^}]*\}/g, "")) && / /.test(inner)) out.push({ kind: "t", text: inner, start: node.start - 1 + offset, end: node.end - 1 + offset, exprs: node.expressions.map((e) => src.slice(e.start - 1, e.end - 1)) });
    }
    for (const k in node) {
      if (k === "type" || k === "start" || k === "end") continue;
      const c = node[k];
      if (Array.isArray(c)) c.forEach((x) => walk(x, node));
      else if (c && typeof c.type === "string") walk(c, node);
    }
  };
  walk(ast, null);
  return out;
}

const all = [];
for (const id of MODULES) {
  const { start, end } = findModule(id);
  for (const c of candidates(bundle.slice(start, end), start)) all.push({ ...c, mod: id });
}

if (mode === "extract") {
  const seen = new Map();
  for (const c of all) {
    const key = c.mod + "|" + c.text;
    if (seen.has(key)) continue;
    const ctx = bundle.slice(Math.max(0, c.start - 70), c.start).replace(/\s+/g, " ");
    seen.set(key, { key, mod: c.mod, kind: c.kind, text: c.text, before: ctx });
  }
  fs.writeFileSync(a2, JSON.stringify([...seen.values()], null, 1));
  console.log("candidates:", seen.size);
} else if (mode === "apply") {
  const dict = JSON.parse(fs.readFileSync(a2, "utf8"));
  let out = bundle,
    done = 0,
    missing = 0,
    bad = 0;
  const reps = [];
  for (const c of all) {
    const ar = dict[c.mod + "|" + c.text];
    if (ar === undefined) {
      missing++;
      continue;
    }
    if (ar === null || ar === c.text) continue;
    if (c.kind === "t") {
      const want = (c.text.match(/\$\{[^}]*\}/g) || []).sort().join();
      const got = (ar.match(/\$\{[^}]*\}/g) || []).sort().join();
      if (want !== got || /`/.test(ar)) {
        bad++;
        console.warn("placeholder mismatch, kept English:", c.mod, c.text.slice(0, 60));
        continue;
      }
      reps.push([c.start, c.end, "`" + (ISOLATE ? isolateTemplate(ar) : ar) + "`"]);
    } else reps.push([c.start, c.end, JSON.stringify(ISOLATE ? isolatePlain(ar) : ar)]);
    done++;
  }
  reps.sort((x, y) => y[0] - x[0]).forEach(([s, e, r]) => (out = out.slice(0, s) + r + out.slice(e)));
  fs.writeFileSync(a3, out);
  console.log(`translated ${done}, untranslated ${missing}, rejected ${bad}`);
}
