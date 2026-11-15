#!/usr/bin/env python3
"""Browser audit for Phase 5 (real Chromium via Playwright): deploy smoke, variants, share links, mini-game.

Deployed-build smoke check (Slice A) runs against the PRODUCTION base path:
    npm run build:pages            # builds with --base=/threadline/ and runs the post-build step
    npm run preview:pages &        # serves dist/ under /threadline/ on port 4173
    BASE_URL=http://localhost:4173/threadline python3 scripts/browser-audit-phase5.py

Reuses the helpers (check, new_page, to_design, build, ...) from scripts/browser-audit.py.
"""
import gzip, glob, os, re, sys, time
_here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_here, "browser-audit.py")).read().split("with sync_playwright() as p:")[0])
BASE = BASE.rstrip("/")
DIST = os.environ.get("DIST", "dist")
BASE_PATH = "/" + BASE.split("://", 1)[1].split("/", 1)[1] if "/" in BASE.split("://", 1)[1] else ""
SWIFT = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]

def first_load_gzip():
    """gzip size of index.html plus the script and stylesheet it loads (the lazy Phaser chunk is not first load)."""
    html = open(os.path.join(DIST, "index.html")).read()
    files = re.findall(r'(?:src|href)="[^"]*?(assets/[^"]+\.(?:js|css))"', html)
    sizes = {f: len(gzip.compress(open(os.path.join(DIST, f), "rb").read(), 9)) for f in files}
    return len(gzip.compress(html.encode(), 9)) + sum(sizes.values()), sizes

with sync_playwright() as p:
    b = p.chromium.launch(args=SWIFT)

    # ------------------------------------------------ Slice A: deployed-build smoke check
    ctx, pg = new_page(b)
    reqs, bad = [], []
    pg.on("request", lambda r: reqs.append(r.url))
    pg.on("response", lambda r: bad.append((r.status, r.url)) if r.status >= 400 else None)
    resp = pg.goto(f"{BASE}/?seed=42")
    pg.wait_for_selector("h1")
    check("Deploy: the page loads under the production base path (HTTP 200)", resp is not None and resp.status == 200, f"{BASE}/ -> {resp.status if resp else None}")
    check("Deploy: the app renders its title screen", pg.locator("h1").first.inner_text() == "Threadline")
    check("Deploy: the Phaser chunk is NOT loaded on first load (it is lazy)", not any("launch-scene" in u for u in reqs))
    pg.get_by_role("button", name="Start mission").click()
    pg.get_by_role("button", name="Open the Design Bay").click()
    pick(pg, LIGHT3); launcher(pg, "Medium launcher")
    pg.get_by_label("Solar array", exact=False).first.fill("320")
    pg.get_by_role("button", name="Auto-size fuel").click(); pg.wait_for_timeout(250)
    pg.get_by_role("button", name="Launch", exact=True).click()
    pg.wait_for_selector("button:has-text('Skip launch')")
    pg.wait_for_timeout(600)
    chunk = [u for u in reqs if "launch-scene" in u]
    check("Deploy: the lazy Phaser chunk loads on launch, from under the base path", len(chunk) == 1 and (BASE_PATH + "/assets/") in chunk[0], str(chunk))
    pg.get_by_role("button", name=re.compile("Skip launch")).click()
    check("Deploy: no request failed (no 404 for any asset) during title, design and launch", not bad, str(bad[:3]))
    check("Deploy: no console errors", not pg.errors, str(pg.errors[:2]))

    maps = glob.glob(os.path.join(DIST, "**", "*.map"), recursive=True)
    js_text = "".join(open(f, errors="ignore").read() for f in glob.glob(os.path.join(DIST, "assets", "*.js")))
    check("Deploy: the production bundle has no source maps", not maps and "sourceMappingURL" not in js_text, str(maps[:2]))
    idx, nf = open(os.path.join(DIST, "index.html")).read(), os.path.join(DIST, "404.html")
    check("Deploy: 404.html exists and is the app (same as index.html)", os.path.exists(nf) and open(nf).read() == idx)
    check("Deploy: .nojekyll is present", os.path.exists(os.path.join(DIST, ".nojekyll")))
    r404 = pg.request.get(f"{BASE}/404.html")
    check("Deploy: /404.html is served", r404.status == 200 and "<div id=\"app\">" in r404.text())
    ctx.close()

    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/"); pg.wait_for_selector("h1")
    link = pg.locator("a[data-link=attributions]")
    check("Attributions: the footer links to the page with a relative URL", link.count() == 1 and link.get_attribute("href") == "attributions.html")
    with ctx.expect_page() as ev:
        link.click()
    tab = ev.value; tab.wait_for_load_state()
    body = tab.locator("body").inner_text()
    check("Attributions: opens under the base path with sources, licence UNVERIFIED notes and the SI acknowledgment (Phase 9: the old wording-pending placeholder is replaced by the real rule)",
          tab.url.startswith(BASE) and "Attributions and sources" in body and "Moon Fact Sheet" in body and "UNVERIFIED" in body and "Built with SI assistance (Claude, Anthropic)" in body and "wording pending" not in body, tab.url)
    ctx.close()

    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?demo=1"); pg.wait_for_selector("h1")
    check("Deploy: Demo Mode (?demo=1) works under the base path", pg.locator("h1").first.inner_text() == "Design Bay" and pg.locator(".demo-badge").count() == 1)
    ctx.close()

    # ------------------------------------------------ Slice B: mission variants (real browser)
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?seed=42"); pg.wait_for_selector("h1")
    pg.get_by_role("button", name="Start mission").click()
    radios = pg.locator("input[name=variant]")
    check("Variants: the Brief offers four choices as one radio group, Standard selected",
          radios.count() == 4 and pg.locator("#variant-standard").is_checked() and pg.locator("fieldset.variants legend").count() == 1)
    check("Variants: every choice shows one sentence and the one number it changes",
          all(t.startswith("Changes:") for t in pg.locator(".variant-change").all_inner_texts()))
    pg.locator("#variant-standard").focus(); pg.keyboard.press("ArrowDown")
    check("Variants: the radios work from the keyboard alone (ArrowDown selects Early storm)", pg.locator("#variant-early-storm").is_checked())
    pg.get_by_label("Tight budget", exact=False).check()
    details = pg.locator(".brief-details").inner_text()
    check("Variants: Tight budget changes the constraints at once ($175M becomes $149M)", "Budget: $149M" in details and "Budget: $175M" not in details, details[:80])
    pg.get_by_role("button", name="Open the Design Bay").click()
    build(pg, ["Radar sounder", "Spectrometer", "Thermal"], "Medium launcher", 150, 260)   # about $168M: fine at $175M, too much at $149M
    check("Variants: the Design Bay uses the new budget and refuses the design with a readable reason (no modal)",
          "$149M" in pg.locator("body").inner_text() and re.search(r"Cannot launch because", pg.locator(".validity").inner_text()) is not None
          and "budget" in pg.locator(".validity").inner_text().lower() and pg.locator("dialog[open]").count() == 0,
          pg.locator(".validity").inner_text()[:120])
    ctx.close()

    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?seed=42"); pg.wait_for_selector("h1")
    pg.get_by_role("button", name="Start mission").click()
    pg.get_by_label("Early storm", exact=False).check()
    pg.get_by_role("button", name="Open the Design Bay").click()
    build(pg, A3, "Medium launcher", 150, 320)
    skip_launch(pg); wait_after_launch(pg)
    pg.wait_for_selector("text=/Paused before orbit/", timeout=20000)
    m = re.search(r"Paused before orbit (\d+)", pg.locator("body").inner_text())
    check("Variants: Early storm warns on orbit 4 or earlier, on the real Mission Control screen", m is not None and 2 <= int(m.group(1)) <= 4, m.group(0) if m else "no match")
    finish_mission(pg, "Ride it out")
    stored = pg.evaluate("() => localStorage.getItem('threadline.save')") or ""
    check("Variants: best tier is stored per (seed, variant): key 42:early-storm", '"42:early-storm"' in stored and '"42":' not in stored, stored[:160])
    check("Variants: no console errors", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ------------------------------------------------ Slice C: share links (real clipboard, real second browser)
    H1 = lambda q: q.locator("h1").first.inner_text()
    ctx, pg = new_page(b)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    to_design(pg, 29)
    build(pg, A3, "Medium launcher", 150, 320)
    launch_and_finish(pg, "Switch off")
    check("Share: the demo recipe (seed 29, Switch off) ends Recovered", "Recovered" in H1(pg), H1(pg))
    pg.get_by_role("button", name="Copy link").click(); pg.wait_for_timeout(300)
    link = pg.evaluate("navigator.clipboard.readText()")
    check("Share: Copy link puts a versioned link under the deployed base path on the clipboard",
          link.startswith(BASE + "/") and "#v=1&seed=29&mission=standard&" in link and "resp=shed-heaviest" in link, link[:140])
    check("Share: the page says the link was copied", "Link copied" in pg.locator(".share-panel").inner_text())
    pg.get_by_role("button", name="Copy summary").click(); pg.wait_for_timeout(300)
    summary = pg.evaluate("navigator.clipboard.readText()")
    check("Share: Copy summary has the tier, all four scores, a cause and the link",
          summary.startswith("Threadline: Recovered") and all(k in summary for k in ("Science yield", "Data return", "Spacecraft health", "Budget margin", "Why: ", "Try to beat it: ")), summary[:90])
    check("Share: no console errors while sharing", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # A friend opens the link in a brand-new browser context (no saved progress at all).
    ctx, pg = new_page(b)
    pg.goto(link); pg.wait_for_timeout(400)
    check("Share: opening the link lands on the Design Bay", H1(pg) == "Design Bay", H1(pg))
    check("Share: the banner says 'Try to beat this: Recovered' (tier recomputed locally)", "Try to beat this: Recovered" in pg.locator(".share-banner").inner_text(), pg.locator(".share-banner").inner_text()[:80])
    check("Share: the shared design is loaded (three instruments ticked)", pg.locator("input[type=checkbox]:checked").count() == 3)
    check("Share: the link is cleared from the address bar (a refresh does not reopen it)", pg.evaluate("location.hash") == "")
    launch_and_finish(pg, "Switch off")
    check("Share: round trip: launching the shared design with the same answer gives the same tier", "Recovered" in H1(pg), H1(pg))
    check("Share: no console errors after opening a link", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # Untrusted input: every bad link starts a normal game with a visible message, never an error.
    good = link.split("#", 1)[1]
    bad_links = {
        "a repeated instrument": good.replace("inst=imager,spectro,thermal", "inst=imager,imager,thermal"),
        "an unknown version": "v=2&seed=1",
        "an oversize link": "v=1&" + "a=1&" * 300,
        "an unknown launcher": good.replace("veh=medium", "veh=rocketship"),
        "a script-looking instrument": good.replace("inst=imager", "inst=%3Cscript%3Ealert(1)%3C/script%3E"),
    }
    for label, frag in bad_links.items():
        ctx, pg = new_page(b)
        pg.goto(f"{BASE}/#{frag}"); pg.wait_for_timeout(300)
        note = pg.locator(".share-banner").inner_text() if pg.locator(".share-banner:not([hidden])").count() else ""
        check(f"Share: {label} is refused with a visible message and a normal game", "could not be opened" in note and H1(pg) == "Threadline" and not pg.errors, f"{note[:70]!r} {H1(pg)!r} {pg.errors[:1]}")
        ctx.close()
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/#" + good.replace("bat=150", "bat=999999")); pg.wait_for_timeout(300)
    check("Share: an out-of-range number is clamped, the Design Bay opens, and the banner says so",
          H1(pg) == "Design Bay" and "adjusted" in pg.locator(".share-banner").inner_text(), pg.locator(".share-banner").inner_text()[:120])
    ctx.close()

    # The browser refuses to copy: the text is shown, selected, for manual copying.
    ctx, pg = new_page(b)
    pg.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))},configurable:true}); document.execCommand=()=>false;")
    to_design(pg, 29); build(pg, A3, "Medium launcher", 150, 320); launch_and_finish(pg, "Switch off")
    pg.get_by_role("button", name="Copy link").click(); pg.wait_for_timeout(300)
    box = pg.locator(".share-text")
    check("Share: when copying is refused the link is shown in a box for manual copying",
          box.is_visible() and "#v=1&seed=29" in box.input_value() and pg.evaluate("document.activeElement.className") == "share-text", box.input_value()[:60] if box.count() else "no box")
    check("Share: the refusal is announced in words", "isn" in pg.locator(".share-panel [role=status]").inner_text(), pg.locator(".share-panel [role=status]").inner_text())
    ctx.close()

    # <<SLICE-MARKER>> later slices add their sections above this line

    b.close()

gz, parts = first_load_gzip()
check("First load stays under 60 KB gzipped", gz < 60 * 1024, f"{gz/1024:.1f} KB  " + ", ".join(f"{k.split('/')[-1]}={v/1024:.1f}KB" for k, v in parts.items()))
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
for n, _, d in fails: print("  FAILED:", n, d)
sys.exit(1 if fails else 0)
