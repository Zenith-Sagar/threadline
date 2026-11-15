#!/usr/bin/env python3
"""Submission screenshots, 1280x720, captured by script so they are repeatable.

    npm run build && npx vite preview --port 4173 &      then      npm run screenshots
    (BASE_URL=http://localhost:4173 by default; OUT=submission/screenshots)

Deterministic: fixed seed (29) and the demo design (Imaging camera, Spectrometer, Thermal infrared radiometer,
Medium launcher, 150 Wh, 320 W), so every run shows the same mission. Writes:
  01-title.png  02-design-bay-threads.png  03-mission-control.png  04-outcome-chain.png  05-diff.png
"""
import os, re, sys
_here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_here, "browser-audit.py")).read().split("with sync_playwright() as p:")[0])
OUT = os.environ.get("OUT", "submission/screenshots")
os.makedirs(OUT, exist_ok=True)
SIZE = {"width": 1280, "height": 720}
written = []
def shot(pg, name):
    path = os.path.join(OUT, name); pg.screenshot(path=path); written.append(path); print("wrote", path)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport=SIZE, device_scale_factor=1, locale="en-US"); pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(f"{BASE}/?seed=29"); pg.wait_for_timeout(500)
    shot(pg, "01-title.png")
    pg.get_by_role("button", name="Start mission").click(); pg.get_by_role("button", name="Open the Design Bay").click(); pg.wait_for_timeout(500)
    if pg.get_by_role("button", name="Skip the guide").count(): pg.get_by_role("button", name="Skip the guide").click()
    build(pg, A3, "Medium launcher", 150, 320); pg.wait_for_timeout(900)
    # the threads: scroll to the top FIRST (the thread layer clears on scroll), change one choice, and capture once the
    # lines have drawn (draw 300 ms, then they hold ~1.4 s)
    pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(300)
    pg.get_by_label("Thermal infrared radiometer", exact=False).first.uncheck(); pg.wait_for_timeout(1700)
    pg.get_by_label("Thermal infrared radiometer", exact=False).first.check(); pg.wait_for_timeout(650)
    shot(pg, "02-design-bay-threads.png")
    pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')")
    pg.get_by_role("button", name=re.compile("Skip launch")).click(); pg.wait_for_selector("button:has-text('Skip to the storm decision'), button:has-text('Choose')")
    sk = pg.get_by_role("button", name=re.compile("Skip to the storm decision"))
    if sk.count(): sk.click()
    pg.wait_for_selector("button:has-text('Choose')"); pg.wait_for_timeout(400)
    # bring the Choose buttons into frame (at 1280x720 they sit just below the fold); the cards and the shared risk line stay visible
    pg.evaluate("document.querySelector('.choose-row').scrollIntoView({block: 'end'}); window.scrollBy(0, 28)"); pg.wait_for_timeout(200)
    shot(pg, "03-mission-control.png")
    pg.get_by_role("button", name=re.compile("Choose: Switch off")).click(); pg.get_by_role("button", name=re.compile("Skip to the end")).click(); pg.get_by_role("button", name="See the outcome").click()
    pg.wait_for_selector("button:has-text('Change one decision')"); pg.wait_for_timeout(1800)
    pg.locator(".chain").first.scroll_into_view_if_needed(); pg.evaluate("window.scrollBy(0, -140)"); pg.wait_for_timeout(300)
    shot(pg, "04-outcome-chain.png")
    pg.get_by_role("button", name="Change one decision").first.click(); pg.wait_for_timeout(300)
    pg.get_by_label("Battery", exact=False).first.fill("300"); pg.get_by_role("button", name="Auto-size fuel").click(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name=re.compile("Run the mission again")).click(); pg.wait_for_selector("h1:has-text('Compared')"); pg.wait_for_timeout(2200)
    pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(100)
    shot(pg, "05-diff.png")
    ctx.close(); b.close()
if errs: print("console errors:", errs[:2]); sys.exit(1)
try:
    from PIL import Image
    for f in written:
        sz = Image.open(f).size
        if sz != (1280, 720): print("WRONG SIZE", f, sz); sys.exit(1)
    print(f"{len(written)} screenshots, all 1280x720")
except ImportError:
    print(f"{len(written)} screenshots written (install Pillow to verify the size)")
