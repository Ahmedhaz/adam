#!/usr/bin/env python3
"""Build the Founder Fog promo site (fog/index.html and fog/ar.html) from
template.html + strings.json, and render the social cards (og-en.png,
og-ar.png) with Playwright when it's available.

Run:  python3 founder-fog-app/site/build.py
"""
import html
import json
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / "fog"


def main():
    tpl = (HERE / "template.html").read_text(encoding="utf-8")
    data = json.loads((HERE / "strings.json").read_text(encoding="utf-8"))
    cfg = data["config"]
    for lang, name in (("en", "index.html"), ("ar", "ar.html")):
        s = dict(data[lang])
        s["base"] = cfg["base"]
        s["play_url"] = cfg["play_" + lang]
        # the iPhone button only appears once there is a public TestFlight link
        s["testflight_button"] = (
            f'<a class="btn btn-ghost" href="{html.escape(cfg["testflight_url"])}"> {html.escape(s["cta_testflight"])}</a>' if cfg["testflight_url"] else ""
        )
        raw = {"testflight_button", "play_url", "base"}
        page = re.sub(r"\{\{(\w+)\}\}", lambda m: s[m.group(1)] if m.group(1) in raw else html.escape(s[m.group(1)], quote=True), tpl)
        left = re.findall(r"\{\{\w+\}\}", page)
        assert not left, f"unfilled placeholders: {left}"
        (OUT / name).write_text(page, encoding="utf-8")
        print("wrote", OUT / name)
    try:
        subprocess.run(["node", str(HERE / "og.cjs"), str(OUT)], check=True)
    except Exception as e:  # social cards are optional for a build
        print("skipped social cards:", e)


if __name__ == "__main__":
    main()
