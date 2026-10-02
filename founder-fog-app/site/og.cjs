// Renders the 1200x630 social cards from the built pages' own assets.
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node-tools/node_modules/playwright");
const path = require("path");
const fs = require("fs");
// pages rendered with setContent can't read file:// URLs, so assets go in as data URIs
const data = (file, type) => `data:${type};base64,` + fs.readFileSync(file).toString("base64");
const FONTS = path.join(__dirname, "..", "enhance", "fonts");
const out = process.argv[2];
const T = {
  en: { dir: "ltr", font: "Archivo", title: "Build a company.<br>Keep your head clear.", sub: "The startup game that tells the truth · free · English & Arabic", brand: "FOUNDER FOG" },
  ar: { dir: "rtl", font: "IBM Plex Sans Arabic", title: "ابنِ شركة.<br>وحافظ على صفاء ذهنك.", sub: "لعبة الشركات الناشئة التي تقول الحقيقة · مجانية · بالعربية والإنجليزية", brand: "ضباب المؤسس" },
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  for (const lang of ["en", "ar"]) {
    const t = T[lang];
    const img = (f) => data(path.join(out, "..", "founder-fog", "img", f), "image/webp");
    const shot = data(path.join(out, "shots", lang + "-hq.webp"), "image/webp");
    const plex = (w) => `@font-face{font-family:"IBM Plex Sans Arabic";font-weight:${w};src:url(${data(path.join(FONTS, "plex-ar-" + w + ".woff2"), "font/woff2")})}`;
    await p.setContent(`<!doctype html><html dir="${t.dir}"><head>
<style>${plex(500)}${plex(600)}body{margin:0;width:1200px;height:630px;font-family:"${t.font}","Helvetica Neue",Arial,sans-serif;background:linear-gradient(160deg,#CFE3FF,#EAF2FF 55%,#F4F6FA);color:#1C2430;display:flex;align-items:center;overflow:hidden}
.t{padding:0 70px;flex:1}.k{font-weight:800;letter-spacing:${lang === "en" ? ".16em" : "0"};color:#FF5A36;font-size:26px}
h1{font-size:${lang === "en" ? 66 : 62}px;line-height:1.12;margin:16px 0 18px;font-weight:800;letter-spacing:${lang === "en" ? "-.03em" : "0"}}
p{font-size:26px;color:#4E5A6B;margin:0}.ph{width:270px;height:584px;border-radius:40px;background:#0E131A;padding:9px;margin:0 70px;transform:rotate(${lang === "en" ? 4 : -4}deg) translateY(40px);box-shadow:0 30px 60px rgba(28,36,48,.25)}
.ph img{width:100%;height:100%;object-fit:cover;border-radius:32px}.f{position:absolute;width:86px}</style></head>
<body><img class="f" src="${img("rocket.webp")}" style="top:40px;${lang === "en" ? "right" : "left"}:330px"><img class="f" src="${img("fog.webp")}" style="bottom:30px;${lang === "en" ? "right" : "left"}:40px">
<div class="t"><div class="k">${t.brand}</div><h1>${t.title}</h1><p>${t.sub}</p></div><div class="ph"><img src="${shot}"></div></body></html>`, { waitUntil: "load" });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, `og-${lang}.png`) });
    console.log("wrote", path.join(out, `og-${lang}.png`));
  }
  await b.close();
})();
