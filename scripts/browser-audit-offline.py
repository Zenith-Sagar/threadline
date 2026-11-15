#!/usr/bin/env python3
"""Smoke audit for the OFFLINE package (relative URLs, served by scripts/serve.mjs). Chromium only.

    BASE_URL=http://127.0.0.1:8080 python3 scripts/browser-audit-offline.py

Every request that is NOT to BASE_URL is aborted and counted, so the checks prove the game needs no internet.
"""
import re, sys
_here = __import__("os").path.dirname(__import__("os").path.abspath(__file__))
exec(open(_here + "/browser-audit.py").read().split("with sync_playwright() as p:")[0])
H1 = lambda q: q.locator("h1").first.inner_text()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    ctx, pg = new_page(b)
    external = []
    def gate(route):
        if route.request.url.startswith(BASE): route.continue_()
        else: external.append(route.request.url); route.abort()
    ctx.route("**/*", gate)
    failed = []
    pg.on("requestfailed", lambda r: failed.append(r.url) if r.url.startswith(BASE) else None)
    pg.goto(BASE + "/"); pg.wait_for_timeout(500)
    check("Offline package: the game loads from relative URLs", H1(pg) == "Threadline", H1(pg))
    # a real launch loads the lazy Phaser chunk and draws a canvas
    pg.goto(BASE + "/?demo=1"); pg.wait_for_timeout(400)
    pg.get_by_role("button", name="Launch", exact=True).click()
    try: pg.wait_for_selector("canvas", timeout=15000); canvas = True
    except Exception: canvas = False
    check("Offline package: the launch animation chunk loads and draws a canvas", canvas)
    pg.get_by_role("button", name=re.compile("Skip launch")).click()
    pg.wait_for_selector("button:has-text('Skip to the storm decision'), button:has-text('Choose')")
    pg.get_by_role("button", name="Skip to the outcome").click()
    pg.wait_for_selector("button:has-text('Change one decision')")
    check("Offline package: the 90-second demo reaches Recovered", "Recovered" in H1(pg), H1(pg))
    check("Offline package: no request left this computer (the game needs no internet)", external == [], str(external[:3]))
    check("Offline package: no local request failed", failed == [], str(failed[:3]))
    check("Offline package: no console errors", not pg.errors, str(pg.errors[:2]))
    # attributions page and licences are reachable and shown
    pg.goto(BASE + "/attributions.html"); pg.wait_for_timeout(300)
    txt = pg.evaluate("document.body.textContent")  # the notices sit in collapsed <details>, which innerText leaves out
    pg.get_by_text("Phaser (MIT)").click(); pg.wait_for_timeout(150)
    opened = pg.locator("details[open] pre.licence").first.is_visible()
    check("Offline package: the Attributions page opens, holds both MIT notices, and a notice can be opened", "Permission is hereby granted" in txt and "Richard Davey" in txt and "Paul Henschel" in txt and opened)
    # an unknown address shows the game (like GitHub Pages' 404.html) with a 404 status
    resp = pg.goto(BASE + "/no-such-page"); pg.wait_for_timeout(300)
    check("Offline package: an unknown address answers 404 and still shows the game", resp.status == 404 and H1(pg) == "Threadline", f"{resp.status} {H1(pg)!r}")
    # the server refuses to read outside the game folder
    for bad in ("/%2e%2e/%2e%2e/etc/passwd", "/..%2f..%2fserve.mjs", "/%00"):
        r = pg.request.get(BASE + bad)
        check(f"Offline package: the server refuses a path-traversal request {bad!r}", r.status in (400, 404) and "root:" not in r.text() and "createServer" not in r.text(), str(r.status))
    ctx.close(); b.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
for n, _, d in fails: print("  FAILED:", n, d)
sys.exit(1 if fails else 0)
