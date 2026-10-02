#!/usr/bin/env python3
"""Build ../../founder-fog/index.html from the original Founder Fog artifact.

The original game only exists as a compiled Expo web bundle (original.html),
so enhancements are applied as patches on top of it:

  * App.js replaces Metro module 144 (the main game screen) wholesale.
  * ENGINE_PATCHES are exact-string edits to the StartupEngine (module 263).
  * The page is wrapped in a mobile/PWA head (manifest, icons, safe areas).

Run:  python3 founder-fog-app/enhance/build.py
"""
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / "founder-fog" / "index.html"

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
        "this.state.mentalClarity=Math.max(0,this.state.mentalClarity-(2+(parseFloat(this.state.runwayMonths)<6?2:0)"
        "+(parseFloat(this.state.runwayMonths)<3?2:0)+(this.state.teamMorale<40?1:0))),"
        "this.applyMoraleAttrition(),",
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

    # 1. swap the main screen module
    app = (HERE / "App.js").read_text(encoding="utf-8")
    app = app[app.index("function ("):].strip()
    mod = re.compile(r"__d\(function\(g,r,i,a,m,_e,d\)\{.*?\},144,(\[[0-9,]*\])\);", re.S)
    start = bundle.rindex("__d(function(g,r,i,a,m,_e,d){", 0, bundle.index("},144,["))
    m = mod.match(bundle, start)
    assert m, "module 144 not found"
    bundle = bundle[: m.start()] + "__d(" + app + ",144," + m.group(1) + ");" + bundle[m.end():]

    # 2. engine patches
    for why, old, new in ENGINE_PATCHES:
        n = bundle.count(old)
        assert n == 1, f"patch '{why}' matched {n} times"
        bundle = bundle.replace(old, new)

    OUT.write_text(HEAD + bundle + TAIL, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
