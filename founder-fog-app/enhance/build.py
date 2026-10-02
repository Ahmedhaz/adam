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
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / "founder-fog" / "index.html"

MODULES = {144: "App.js", 265: "Onboarding.js"}

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
        "Magnetic perk: relationships decay half as fast",
        "health:Math.max(0,e.health-2)",
        'health:Math.max(0,e.health-((this.state.perks||[]).includes("magnetic")?1:2))',
    ),
]

HEAD = """<!doctype html>
<html lang="ar">
<head>
<meta charset="utf-8">
<title>Founder Fog</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no">
<meta name="description" content="Founder Fog — a startup survival game. Run your company week by week, manage runway, team and your own mental clarity.">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Founder Fog">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#10151A">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>
  html, body { height: 100%; margin: 0; background: #10151A; }
  body { overflow: hidden; -webkit-text-size-adjust: 100%; overscroll-behavior: none; -webkit-user-select: none; user-select: none; }
  #root { display: flex; height: 100%; flex: 1; background: #10151A; box-sizing: border-box;
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
  [data-ff="vignette"] { background: radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(224,163,62,.10) 78%, rgba(10,13,16,.9) 100%); }
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
        end_marker = "},%d,[" % mod_id
        start = bundle.rindex("__d(function(", 0, bundle.index(end_marker))
        m = re.compile(r"__d\(function\([^)]*\)\{.*?\},%d,(\[[0-9,]*\])\);" % mod_id, re.S).match(bundle, start)
        assert m, f"module {mod_id} not found"
        bundle = bundle[: m.start()] + "__d(" + code + ",%d," % mod_id + m.group(1) + ");" + bundle[m.end():]

    # 2. engine patches
    for why, old, new in ENGINE_PATCHES:
        n = bundle.count(old)
        assert n == 1, f"patch '{why}' matched {n} times"
        bundle = bundle.replace(old, new)

    OUT.write_text(HEAD + bundle + TAIL, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
