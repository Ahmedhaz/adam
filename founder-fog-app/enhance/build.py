#!/usr/bin/env python3
"""Build ../../founder-fog/index.html from the original Founder Fog artifact.

The original game only exists as a compiled Expo web bundle (original.html),
so enhancements are applied as patches on top of it:

  * App.js replaces Metro module 144 (the game shell / HQ screen) and
    Onboarding.js replaces module 265 (title screen + new-company setup).
  * Animations and the fog are CSS keyed on data-ff attributes (RN dataSet).
  * ENGINE_PATCHES are exact-string edits to the StartupEngine (module 263).
  * The page is wrapped in a mobile/PWA head (manifest, icons, safe areas).

Run:  python3 founder-fog-app/enhance/build.py
"""
import base64
import json
import pathlib
import re
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / "founder-fog" / "index.html"
OUT_AR = OUT.with_name("ar.html")
DICT_AR = HERE / "ar.json"
PICS = json.loads((HERE / "pics.json").read_text(encoding="utf-8"))  # emoji -> img/<name>.webp


def pics_css():
    rules = ['  [data-pic] { background-size: contain; background-repeat: no-repeat; background-position: center; }']
    rules += [f'  [data-pic="{name}"] {{ background-image: url(img/{name}.webp); }}' for name in sorted(set(PICS.values()))]
    return "\n".join(rules)

MODULES = {144: "App.js", 265: "Onboarding.js"}

# Bright, BitLife-style look: the shared theme module (267) drives every screen.
THEME_PATCHES = [
    ("const t={ink:'#10151A',panel:'#171D24',panel2:'#1D242D',line:'#242D38',lineHot:'#33404E',text:'#DCE4EC',text2:'#93A1B0',text3:'#66727F',vital:'#5FB98A',fog:'#E0A33E',crit:'#D9695F',act:'#5B8DD6',gold:'#C9A227',accent:'#EC3013',burnoutGround:'#141017'}",
     "const t={ink:'#EEF2F7',panel:'#FFFFFF',panel2:'#F4F6FA',line:'#E3E8EF',lineHot:'#C9D3E0',text:'#1C2430',text2:'#4E5A6B',text3:'#8C97A6',vital:'#22A559',fog:'#E38A00',crit:'#E5484D',act:'#2D7FF9',gold:'#C28F00',accent:'#FF5A36',burnoutGround:'#F4EEF2'}"),
]
# Badge colours hard-coded in the original screens were tuned for a dark background.
BADGE_COLORS = {"'#3b2d00'": "'#FFF4CC'", '"#3b2d00"': '"#FFF4CC"', '"#0b3318"': '"#DDF5E5"', '"#004a77"': '"#DCEBFF"',
                '"#3d1210"': '"#FDE2E0"', '"#2b164a"': '"#EEE3FF"', '"#8c1d18"': '"#FDE2E0"',
                '"#fbbc04"': '"#B07D00"', '"#34a853"': '"#1E8E3E"', '"#f28b82"': '"#C5221F"', '"#a479e2"': '"#7B4FD0"'}

ENGINE_PATCHES = [
    (
        "round the cash figure in the weekly sprint log",
        "Remaining Cash: $${this.state.cash.toLocaleString()}",
        "Remaining Cash: $${Math.round(this.state.cash).toLocaleString()}",
    ),
    (
        "one strategy per weekly target (stops free strategies being repeated for unlimited gains)",
        'executeTargetStrategy(e){const t=this.state.currentTarget;if(!t||!t.howToGuide)return{success:!1,reason:"No target strategies available."};',
        'executeTargetStrategy(e){const t=this.state.currentTarget;if(!t||!t.howToGuide)return{success:!1,reason:"No target strategies available."};'
        'if(this.state.completedTargets.includes(t.week))return{success:!1,reason:"You already hit this week\'s target. Advance the week for a new one."};',
    ),
    (
        "founder stress: clarity drains every week, faster when runway is short or the team is unhappy, so the fog actually rolls in",
        "this.state.cac=Math.max(s,this.state.cac*p),this.applyMoraleAttrition(),",
        "this.state.cac=Math.max(s,this.state.cac*p),"
        "this.state.mentalClarity=Math.max(0,this.state.mentalClarity-(((this.state.perks||[]).includes(\"stoic\")?1:2)+(parseFloat(this.state.runwayMonths)<6?2:0)"
        "+(parseFloat(this.state.runwayMonths)<3?2:0)+(this.state.teamMorale<40?1:0))),"
        "this.applyMoraleAttrition(),",
    ),
    (
        "no infinite runway: a profitable company is 'default alive' (economy.js)",
        "(${this.state.runwayMonths} Mo Runway)",
        '(${this.state.runwayText||this.state.runwayMonths})',
    ),
    (
        "stages no longer jump the valuation; economy.js values the company on ARR x multiple",
        "this.state.valuation=Math.max(this.state.valuation,e.valuation),",
        "",
    ),
    (
        "low morale makes employees resign, not the co-founder; he leaves over the relationship (org.js)",
        'const e=this.state.team.filter(e=>"emp_founder"!==e.id);',
        'const e=this.state.team.filter(e=>"emp_founder"!==e.id&&"emp_cto"!==e.id);',
    ),
    (
        "stage logs: no more automatic valuation upgrades (seed)",
        'logText:"MRR surpassed $5,000! Company valuation upgraded to $1.5M!"',
        'logText:"MRR surpassed $5,000! You\'re a seed-stage company now. Investors will judge you on growth from here."',
    ),
    (
        "stage logs: no more automatic valuation upgrades (series A)",
        'logText:"MRR reached $40,000! Company valuation upgraded to $10M!"',
        'logText:"MRR reached $40,000! You\'re a Series A company now. The valuation follows your growth and retention."',
    ),
    (
        "stage logs: no more automatic valuation upgrades (unicorn)",
        'logText:"MRR reached $250,000! Valuation upgraded to $100M. You have built a unicorn."',
        'logText:"MRR reached $250,000! Unicorn territory. Keep growth high and churn low and the market will price you at $100M."',
    ),
    (
        "ad channels saturate faster and recover slower (CAC +18% per campaign, -1.5%/week); a weekly target adds at most 3% MRR, not 6%",
        "const u=14,m=1.12,p=.99,f=.06",
        "const u=14,m=1.18,p=.985,f=.03",
    ),
    (
        "a happy team still compounds growth, but 0.8%/week instead of 1.5%",
        "this.state.monthlyRevenue*=1.015,this.state.activeUsers*=1.015",
        "this.state.monthlyRevenue*=1.008,this.state.activeUsers*=1.008",
    ),
    (
        "target strategies land 50%-120% of their revenue promise, and at least $700 (not $1,200) early on",
        "const e=r.monthlyRevenue>0?Math.min(r.monthlyRevenue,Math.max(1200,this.state.monthlyRevenue*f)):r.monthlyRevenue;",
        "const e=r.monthlyRevenue>0?Math.round(Math.min(r.monthlyRevenue,Math.max(700,this.state.monthlyRevenue*f))*(.5+.7*Math.random())):r.monthlyRevenue;",
    ),
    (
        "campaigns: results vary (60%-130%), pricier products cost more to sell, and only 30% of new users pay",
        "const e=3e3,t=Math.max(1,Math.round(e/Math.max(1,this.state.cac))),s=t*this.state.arpu;",
        "const e=3e3,t=Math.max(1,Math.round(e/Math.max(1,this.state.cac*Math.sqrt(Math.max(1,this.state.arpu/25)))*(.6+.7*Math.random()))),s=Math.round(t*this.state.arpu*.3);",
    ),
    (
        "Magnetic perk: relationships decay half as fast",
        "health:Math.max(0,e.health-2)",
        'health:Math.max(0,e.health-((this.state.perks||[]).includes("magnetic")?1:2))',
    ),
]

# New endings from org.js (board replaces you, co-founder breakup) for the original game-over screen.
ENDINGS_PATCH = (
    "exit:{ground:s.COLOR.ink,accent:s.COLOR.gold,kicker:'ENDING \\xb7 EXIT'",
    "board:{ground:s.COLOR.ink,accent:s.COLOR.crit,kicker:'ENDING \\xb7 REPLACED',title:'The board replaced you.',"
    "body:'They thanked you for everything you built and asked for your laptop by Friday. You gave away control one reasonable-looking term sheet at a time.',"
    "closing:'Read the board clause before you read the valuation.',lift:!0},"
    "cofounder:{ground:s.COLOR.ink,accent:s.COLOR.crit,kicker:'ENDING \\xb7 CO-FOUNDER BREAKUP',title:'Tariq left, and the company went with him.',"
    "body:'Half the code, half the late nights and most of the reasons early customers trusted you walked out of the same door.',"
    "closing:'Most young startups die of founder problems, not market problems.',lift:!0},"
    "alone:{ground:s.COLOR.burnoutGround,accent:s.COLOR.fog,kicker:'ENDING \\xb7 ALONE',title:'You built a company, and lost everyone who would have celebrated it.',"
    "body:'Nour moved out in the spring. Your parents stopped asking how it was going. The company is still running. You are not sure who it is for.',"
    "closing:'The people outside the company are not a distraction from it.',lift:!1},"
    "challenge:{ground:s.COLOR.ink,accent:s.COLOR.gold,kicker:'CHALLENGE \\xb7 COMPLETE',title:'Challenge complete.',"
    "body:'You set one goal and hit it before the deadline. Real companies rarely get one clear goal at a time, which is why practising with one helps.',"
    "closing:'Try a harder challenge, or play a full run.',lift:!0},"
    "challenge_failed:{ground:s.COLOR.ink,accent:s.COLOR.crit,kicker:'CHALLENGE \\xb7 FAILED',title:'The deadline came first.',"
    "body:'The goal was within reach, but not this time. Look at the report card: the turning point is usually earlier than it feels.',"
    "closing:'Every founder fails a few deadlines. The good ones know why.',lift:!0},"
    "exit:{ground:s.COLOR.ink,accent:s.COLOR.gold,kicker:'ENDING \\xb7 EXIT'",
)

# Code-level tweaks that only the Arabic build needs.
ARABIC_PATCHES = [
    # activity category colours are keyed by the (now translated) category names
    ("const f={Wellness:s.COLOR.vital,Network:s.COLOR.act,Governance:s.COLOR.fog,Crisis:s.COLOR.crit}",
     'const f={"\u0627\u0644\u0639\u0627\u0641\u064a\u0629":s.COLOR.vital,"\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a":s.COLOR.act,'
     '"\u0627\u0644\u062d\u0648\u0643\u0645\u0629":s.COLOR.fog,"\u0627\u0644\u0623\u0632\u0645\u0627\u062a":s.COLOR.crit}'),
    # activity effect labels: keep "+18" together in right-to-left text
    ("`${t[e]||e} ${o>0?'+':''}${o}`", "`${t[e]||e} \u2066${o>0?'+':''}${o}\u2069`"),
]

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Founder Fog</title>
<script>
  // Language: remember the player's choice; first visit follows the device language.
  (function () {
    var page = document.documentElement.lang, pref = null;
    try { pref = localStorage.getItem("founderFog.lang"); } catch (e) {}
    var want = pref || ((navigator.language || "").toLowerCase().indexOf("ar") === 0 ? "ar" : "en");
    if (want !== page) location.replace(want === "ar" ? "ar.html" : "index.html");
  })();
  // Keep Western digits everywhere (the fog scrambles 0-9; Arabic locales would switch to Arabic-Indic).
  (function (orig) {
    Number.prototype.toLocaleString = function (locale, opts) { return orig.call(this, locale || "en-US", opts); };
  })(Number.prototype.toLocaleString);
</script>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no">
<meta name="description" content="Founder Fog — a startup survival game. Run your company week by week, manage runway, team and your own mental clarity.">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Founder Fog">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#EEF2F7">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>
  html, body { height: 100%; margin: 0; background: #EEF2F7; }
  body { overflow: hidden; -webkit-text-size-adjust: 100%; overscroll-behavior: none; -webkit-user-select: none; user-select: none; }
  #root { display: flex; height: 100%; flex: 1; background: #EEF2F7; box-sizing: border-box;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  input, textarea { -webkit-user-select: text; user-select: text; }
  * { -webkit-tap-highlight-color: transparent; }

  /* motion */
  @keyframes ff-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes ff-pop { from { opacity: 0; transform: translateY(24px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes ff-toast { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ff-pulse { 0% { box-shadow: 0 0 0 0 rgba(236,48,19,.55); } 70%, 100% { box-shadow: 0 0 0 14px rgba(236,48,19,0); } }
  @keyframes ff-glow { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
  @keyframes ff-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes ff-drift { from { background-position: 0% 40%, 100% 60%, 50% 0%; } to { background-position: 100% 60%, 0% 40%, 50% 100%; } }
  [data-ff^="rise"] { animation: ff-rise .5s cubic-bezier(.2,.8,.2,1) both; }
  [data-ff="rise2"] { animation-delay: .06s; }
  [data-ff="rise3"] { animation-delay: .12s; }
  [data-ff="rise4"] { animation-delay: .18s; }
  [data-ff="pop"] { animation: ff-pop .35s cubic-bezier(.2,.9,.25,1) both; }
  [data-ff="toast"] { animation: ff-toast .25s ease-out both; }
  [data-ff="pulse"] { animation: ff-pulse 1.8s ease-out infinite; }
  [data-ff="glow"] { animation: ff-glow 1.6s ease-in-out infinite; }
  [data-ff="float"] { animation: ff-float 5s ease-in-out infinite; }
  [data-ff="float2"] { animation: ff-float 6.5s ease-in-out -2s infinite; }
  [data-ff="sky"] { background: linear-gradient(180deg, #CFE3FF 0%, #EAF2FF 45%, #F7F9FC 100%) !important; }

  /* the fog: drifting haze that blurs whatever is under it */
  [data-ff="fog"], [data-ff="fogbank"] {
    background:
      radial-gradient(60% 50% at 30% 40%, rgba(214,222,230,.55), transparent 70%),
      radial-gradient(55% 60% at 75% 60%, rgba(224,190,130,.35), transparent 72%),
      radial-gradient(80% 40% at 50% 50%, rgba(160,172,186,.35), transparent 75%);
    background-size: 220% 220%, 200% 200%, 180% 180%;
    animation: ff-drift 16s ease-in-out infinite alternate;
    -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  }
  [data-ff="fogbank"] { opacity: .32; -webkit-backdrop-filter: none; backdrop-filter: none; animation-duration: 24s; }
  [data-ff="vignette"] { background: radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(214,220,228,.55) 75%, rgba(170,180,192,.9) 100%); }
  @media (prefers-reduced-motion: reduce) { [data-ff] { animation: none !important; } }
</style>
</head>
<body>
<div id="root"></div>
"""

TAIL = """
<script>
  // Offline support when installed from the web (skipped inside the native shell).
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js'); });
  }
</script>
</body>
</html>
"""


def main():
    src = (HERE / "original.html").read_text(encoding="utf-8")
    marker = '<div id="root"></div>'
    bundle = src[src.index(marker) + len(marker): src.rindex("</body>")].strip()

    # 1. swap whole modules for the rewritten screens
    for mod_id, fname in MODULES.items():
        code = (HERE / fname).read_text(encoding="utf-8")
        # "// @include other.js" inlines a sibling file into the module scope
        code = re.sub(r"^// @include (\S+)$", lambda inc: (HERE / inc.group(1)).read_text(encoding="utf-8"), code, flags=re.M)
        code = code[code.index("function ("):].strip()
        code = code.replace("/*@PICS*/ {}", json.dumps(PICS, ensure_ascii=False))
        end_marker = "},%d,[" % mod_id
        start = bundle.rindex("__d(function(", 0, bundle.index(end_marker))
        m = re.compile(r"__d\(function\([^)]*\)\{.*?\},%d,(\[[0-9,]*\])\);" % mod_id, re.S).match(bundle, start)
        assert m, f"module {mod_id} not found"
        bundle = bundle[: m.start()] + "__d(" + code + ",%d," % mod_id + m.group(1) + ");" + bundle[m.end():]

    # 2. theme + engine patches
    for old, new in THEME_PATCHES:
        assert bundle.count(old) == 1, f"theme patch not found: {old[:40]}"
        bundle = bundle.replace(old, new)
    for old, new in BADGE_COLORS.items():
        bundle = bundle.replace(old, new)
    assert bundle.count(ENDINGS_PATCH[0]) == 1, "endings patch"
    bundle = bundle.replace(ENDINGS_PATCH[0], ENDINGS_PATCH[1])
    for why, old, new in ENGINE_PATCHES:
        n = bundle.count(old)
        assert n == 1, f"patch '{why}' matched {n} times"
        bundle = bundle.replace(old, new)

    global HEAD
    HEAD = HEAD.replace("</style>", "  /* 3D pictures */\n" + pics_css() + "\n</style>", 1)
    OUT.write_text(HEAD + bundle + TAIL, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes)")

    # 3. Arabic build: same bundle with visible strings swapped (translate.mjs), right-to-left
    if DICT_AR.exists():
        build_arabic(bundle)


def arabic_head():
    """The English head, switched to Arabic/RTL, with IBM Plex Sans Arabic embedded for Arabic glyphs."""
    fonts = HERE / "fonts"
    urange = (fonts / "plex-unicode-range.txt").read_text().strip()
    faces = []
    for family, weight in [("Archivo_400Regular", 400), ("Archivo_500Medium", 500), ("Archivo_600SemiBold", 600),
                           ("AzeretMono_400Regular", 400), ("AzeretMono_500Medium", 500), ("AzeretMono_600SemiBold", 600)]:
        b64 = base64.b64encode((fonts / f"plex-ar-{weight}.woff2").read_bytes()).decode()
        faces.append(f'  @font-face {{ font-family: "{family}"; src: url(data:font/woff2;base64,{b64}) format("woff2"); unicode-range: {urange}; }}')
    rtl_css = "\n".join(faces) + """
  /* letter-spacing breaks Arabic letter joining */
  html[dir="rtl"] * { letter-spacing: 0 !important; }
"""
    head = HEAD.replace('<html lang="en">', '<html lang="ar" dir="rtl">', 1)
    head = head.replace("<style>", "<style>\n" + rtl_css, 1)
    return head


def build_arabic(bundle):
    with tempfile.TemporaryDirectory() as tmp:
        src, out = pathlib.Path(tmp) / "en.js", pathlib.Path(tmp) / "ar.js"
        src.write_text(bundle, encoding="utf-8")
        subprocess.run(["node", str(HERE / "translate.mjs"), "apply", str(src), str(DICT_AR), str(out), "--isolate-numbers"], check=True)
        ar = out.read_text(encoding="utf-8")
    for old, new in ARABIC_PATCHES:
        assert ar.count(old) == 1, f"arabic patch not found: {old[:50]}"
        ar = ar.replace(old, new)
    # arrows point the other way in a right-to-left UI
    ar = ar.replace("\u25b8", "\u25c2").replace("\\u25b8", "\\u25c2")
    ar = ar.replace('"\u2039"', '"\u203a"')
    OUT_AR.write_text(arabic_head() + ar + TAIL, encoding="utf-8")
    print(f"wrote {OUT_AR} ({OUT_AR.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
