#!/usr/bin/env python3
"""Phase 6 browser audit: regression checks for the review findings, and robustness checks.

    npm run build && npx vite preview --port 4173 &     (BASE_URL=http://localhost:4173 by default)
    python3 scripts/browser-audit-phase6.py

Prints PASS/FAIL per check and "N/M checks passed". Chromium only (see KNOWN_ISSUES.md for Firefox/WebKit).
"""
import re, sys
_here = __import__("os").path.dirname(__import__("os").path.abspath(__file__))
exec(open(_here + "/browser-audit.py").read().split("with sync_playwright() as p:")[0])
H1 = lambda q: q.locator("h1").first.inner_text()

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])

    # ---- F1 (Medium): the Unverified placeholder badge stays visible in the 390 px meter strip --------------------
    ctx, pg = new_page(b)
    pg.set_viewport_size({"width": 390, "height": 844})
    to_design(pg, 42)
    if pg.get_by_role("button", name="Skip the guide").count(): pg.get_by_role("button", name="Skip the guide").click()
    badge = pg.locator('.status-col .meter .tag[data-label="UNVERIFIED PLACEHOLDER"]').first
    box = badge.bounding_box() if badge.count() else None
    check("F1: at 390 px the Fuel margin meter shows its 'Unverified placeholder' badge (not clipped)",
          bool(box) and box["width"] > 40 and box["height"] > 10 and badge.is_visible(), str(box))
    hidden_ok = pg.evaluate("""() => [...document.querySelectorAll('.status-col .meter .tag:not([data-label="UNVERIFIED PLACEHOLDER"])')].every(e => e.getBoundingClientRect().width <= 2)""")
    check("F1: at 390 px the other compact tags stay visually hidden (still in the page for screen readers)", hidden_ok)
    check("F1: no horizontal scroll at 390 px with the badge visible", pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0)
    ctx.close()
    ctx, pg = new_page(b)
    to_design(pg, 42)
    if pg.get_by_role("button", name="Skip the guide").count(): pg.get_by_role("button", name="Skip the guide").click()
    check("F1: at 1280 px the badge is still shown", pg.locator('.status-col .meter .tag[data-label="UNVERIFIED PLACEHOLDER"]').first.is_visible())
    ctx.close()

    # ---- F2: the review script's "clipped text" flags on cause chains are screen-reader-only labels -----------------
    ctx, pg = new_page(b)
    to_design(pg, 29); build(pg, A3, "Medium launcher", 150, 320); launch_and_finish(pg, "Switch off")
    pg.wait_for_timeout(1500)
    odd = pg.evaluate("""() => [...document.querySelectorAll('main .chain *')].filter(e => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible')
        .filter(e => !e.closest('.sr-only')).map(e => e.textContent.trim().slice(0, 40))""")
    check("F2: every clipped element inside a cause chain is a screen-reader-only label (no visible text is cut off)", odd == [], str(odd[:3]))
    ctx.close()

    # ================================================ F4 (Phase 7): the storm decision needs less scrolling on a phone
    def to_storm_decision(pg):
        design_ready_f4(pg)
        pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')")
        pg.get_by_role("button", name=re.compile("Skip launch")).click(); wait_after_launch(pg)
        sk = pg.get_by_role("button", name=re.compile("Skip to the storm decision"))
        if sk.count(): sk.click()
        pg.wait_for_selector("button:has-text('Choose')"); pg.wait_for_timeout(300)
    def design_ready_f4(pg):
        to_design(pg, 29)
        if pg.get_by_role("button", name="Skip the guide").count(): pg.get_by_role("button", name="Skip the guide").click()
        build(pg, A3, "Medium launcher", 150, 320)
    ALL3 = "() => [...document.querySelectorAll('.choose-row button')].every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })"
    for (w, h) in ((390, 844), (360, 640)):
        ctx, pg = new_page(b); pg.set_viewport_size({"width": w, "height": h})
        to_storm_decision(pg)
        geo = pg.evaluate("() => { const r = document.querySelector('.storm-panel').getBoundingClientRect(); return {top: Math.round(r.top + scrollY), h: Math.round(r.height)}; }")
        seen = []
        for off in (-10, 200, 500, 800, geo["h"] - h - 100):
            pg.evaluate(f"window.scrollTo(0, {max(0, geo['top'] + off)})"); pg.wait_for_timeout(120); seen.append(pg.evaluate(ALL3))
        check(f"F4: at {w}x{h} all three Choose buttons stay fully on screen at every scroll position through the decision", all(seen), str(seen))
        pg.evaluate(f"window.scrollTo(0, {max(0, geo['top'] - 10)})"); pg.wait_for_timeout(120)
        cov = pg.evaluate("() => { const hd = document.querySelector('.response h3').getBoundingClientRect(); const row = document.querySelector('.choose-row').getBoundingClientRect(); return hd.bottom > row.top && hd.top < row.bottom; }")
        check(f"F4: at {w}x{h} the sticky row does not cover the first card's heading", not cov)
        ctx.close()
    ctx, pg = new_page(b); pg.set_viewport_size({"width": 390, "height": 844}); to_storm_decision(pg)
    t = pg.locator(".storm-panel").inner_text()
    cards = pg.locator(".response").all()
    check("F4: the 15% radiation chance is stated once for the whole decision, not once per card", t.count("chance of permanent radiation damage") == 1, str(t.count("chance of permanent radiation damage")))
    check("F4: every card still shows its own Costs, Risks and Power rows and its model labels",
          len(cards) == 3 and all(all(k in c.inner_text() for k in ("Costs", "Risks", "Power", "GAME MODEL")) for c in cards))
    check("F4: each card's Risks row says which instruments are left exposed (or that none are)", "Left running and exposed" in cards[0].inner_text() and "Nothing is left running" in cards[2].inner_text())
    check("F4: the Choose row is sticky on a phone", pg.evaluate("getComputedStyle(document.querySelector('.choose-row')).position") == "sticky")
    pg.get_by_role("button", name=re.compile("Choose: Switch off")).click(); pg.wait_for_timeout(300)
    check("F4: choosing from the sticky row works and the decision closes", pg.locator(".choose-row").count() == 0 and "Your storm response" in pg.locator("main").inner_text())
    ctx.close()
    ctx, pg = new_page(b); pg.set_viewport_size({"width": 1280, "height": 720}); to_storm_decision(pg)
    pos = pg.evaluate("""() => { const row = document.querySelector('.choose-row'); const cards = [...document.querySelectorAll('.response')].map(c => c.getBoundingClientRect());
        const bs = [...row.querySelectorAll('button')].map(b => b.getBoundingClientRect()); return {pos: getComputedStyle(row).position, aligned: bs.every((r, i) => r.left >= cards[i].left - 1 && r.right <= cards[i].right + 1)}; }""")
    check("F4: on a wide screen the row is not sticky and each button sits under its own card", pos["pos"] != "sticky" and pos["aligned"], str(pos))
    ctx.close()
    # F6 (pure copy only): the Brief spells out "Mb" where players first meet it
    ctx, pg = new_page(b); pg.goto(BASE + "/?seed=1"); pg.get_by_role("button", name="Start mission").click()
    check("F6: the Brief explains 'Mb' as megabits where it first appears", "megabits (Mb)" in pg.locator("main").inner_text())
    ctx.close()

    # ================================================ Slice C: robustness (faults injected on purpose)
    CHUNK = "**/assets/launch-scene-*.js"
    def unexpected(pg, allow=()):
        """Console errors that are NOT the fault we injected on purpose."""
        return [e for e in pg.errors if not any(a in e for a in allow)]
    def design_ready(pg, seed=29):
        to_design(pg, seed)
        if pg.get_by_role("button", name="Skip the guide").count(): pg.get_by_role("button", name="Skip the guide").click()
        build(pg, A3, "Medium launcher", 150, 320)

    # -- storage blocked (private mode / blocked cookies): every access throws
    ctx, pg = new_page(b)
    pg.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}});")
    design_ready(pg); launch_and_finish(pg, "Switch off")
    check("Robust: with storage blocked the whole loop still ends in Recovered", "Recovered" in H1(pg), H1(pg))
    check("Robust: with storage blocked the page says progress will not be kept", "blocks saving" in pg.locator("footer").inner_text())
    pg.get_by_label("High contrast").check(); pg.wait_for_timeout(150)
    check("Robust: with storage blocked the display settings still work for this visit", pg.evaluate("document.documentElement.dataset.theme") == "contrast")
    check("Robust: with storage blocked there is no console or page error", unexpected(pg) == [], str(pg.errors[:2]))
    ctx.close()

    # -- clipboard missing entirely (an insecure page has no navigator.clipboard)
    ctx, pg = new_page(b)
    pg.add_init_script("Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}); document.execCommand=()=>false;")
    design_ready(pg); launch_and_finish(pg, "Switch off")
    pg.get_by_role("button", name="Copy link").click(); pg.wait_for_timeout(300)
    check("Robust: with no clipboard API the link is shown for manual copying", pg.locator(".share-text").is_visible() and "#v=1&seed=29" in pg.locator(".share-text").input_value())
    check("Robust: with no clipboard API there is no error", unexpected(pg) == [], str(pg.errors[:2]))
    ctx.close()

    # -- the launch chunk is broken in three different ways: the text launch takes over and the game continues
    faults = {
        "throws when it loads": lambda r: r.fulfill(status=200, content_type="text/javascript", body="throw new Error('boom from the launch chunk');"),
        "cannot be fetched (404)": lambda r: r.fulfill(status=404, body="not found"),
        "throws when it starts": lambda r: r.fulfill(status=200, content_type="text/javascript", body="export function startPhaserLaunch(){ throw new Error('boom on start'); }"),
    }
    for name, handler in faults.items():
        ctx, pg = new_page(b)
        design_ready(pg); ctx.route(CHUNK, handler)
        pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')")
        pg.wait_for_timeout(1200)
        cap = pg.locator(".launch-caption").first.inner_text()
        check(f"Robust: when the launch chunk {name}, the screen is not blank and shows words, not the animation canvas",
              pg.locator("canvas").count() == 0 and len(pg.locator("main").inner_text()) > 40 and "Preparing" not in cap, cap[:70])
        pg.get_by_role("button", name=re.compile("Skip launch")).click(); wait_after_launch(pg); finish_mission(pg, "Switch off")
        check(f"Robust: when the launch chunk {name}, the game still reaches Recovered", "Recovered" in H1(pg), H1(pg))
        check(f"Robust: when the launch chunk {name}, nothing but the injected fault is reported", unexpected(pg, ("boom", "Failed to load resource", "404", "Failed to fetch dynamically imported", "error loading dynamically imported")) == [], str(pg.errors[:2]))
        ctx.close()

    # -- slow network: the launch chunk is held back. Skip works at once; releasing it later does no harm.
    ctx, pg = new_page(b)
    design_ready(pg); held = []; ctx.route(CHUNK, lambda r: held.append(r))
    pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')")
    pg.wait_for_timeout(1500)
    check("Robust: while the launch chunk is slow, the page says it is preparing and Skip is available", "Preparing the launch" in pg.locator(".launch-caption").first.inner_text() and pg.get_by_role("button", name=re.compile("Skip launch")).is_enabled())
    pg.get_by_role("button", name=re.compile("Skip launch")).click(); wait_after_launch(pg)
    check("Robust: skipping while the chunk is still downloading goes straight to Mission Control", H1(pg) == "Mission Control", H1(pg))
    for r in held: r.continue_()
    pg.wait_for_timeout(2500)
    check("Robust: the late chunk arriving afterwards does not pull the player back or draw over the screen", H1(pg) == "Mission Control" and pg.locator("canvas").count() == 0, f"{H1(pg)!r} canvases={pg.locator('canvas').count()}")
    finish_mission(pg, "Switch off")
    check("Robust: after a slow load the game finishes normally", "Recovered" in H1(pg) and unexpected(pg) == [], str(pg.errors[:2]))
    ctx.close()
    # ...and a patient player gets the animation once it arrives
    ctx, pg = new_page(b)
    design_ready(pg); held = []; ctx.route(CHUNK, lambda r: held.append(r))
    pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')"); pg.wait_for_timeout(2500)
    for r in held: r.continue_()
    try: pg.wait_for_selector("canvas", timeout=15000); got = True
    except Exception: got = False
    check("Robust: a slow chunk that finally arrives still plays the launch animation", got)
    ctx.close()

    # -- the network drops AFTER the page loaded and BEFORE the first launch
    ctx, pg = new_page(b)
    design_ready(pg); ctx.set_offline(True)
    pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')")
    pg.get_by_role("button", name=re.compile("Skip launch")).click(); wait_after_launch(pg); finish_mission(pg, "Switch off")
    check("Robust: offline after load, the whole loop still ends in Recovered", "Recovered" in H1(pg), H1(pg))
    pg.get_by_role("button", name="Copy link").click(); pg.wait_for_timeout(300)
    check("Robust: offline after load, sharing still works (it needs no network)", pg.locator(".share-panel [role=status]").inner_text() != "")
    check("Robust: offline after load, nothing but the failed download is reported", unexpected(pg, ("Failed to load resource", "ERR_INTERNET_DISCONNECTED", "Failed to fetch dynamically imported", "error loading dynamically imported")) == [], str(pg.errors[:2]))
    ctx.close()

    # -- the window is resized while the animation plays
    ctx, pg = new_page(b)
    design_ready(pg)
    pg.get_by_role("button", name="Launch", exact=True).click()
    try: pg.wait_for_selector("canvas", timeout=15000); has_canvas = True
    except Exception: has_canvas = False
    sizes_ok, detail = True, []
    for (w, h) in ((390, 844), (820, 1100), (1280, 800), (600, 500)):
        pg.set_viewport_size({"width": w, "height": h}); pg.wait_for_timeout(500)
        m = pg.evaluate("() => { const c = document.querySelector('canvas'); const de = document.documentElement; return {over: de.scrollWidth - de.clientWidth, cw: c ? Math.round(c.getBoundingClientRect().width) : 0}; }")
        detail.append((w, m)); sizes_ok = sizes_ok and m["over"] <= 0 and m["cw"] <= w
    check("Robust: resizing during the launch animation never causes sideways scrolling or an oversized canvas", has_canvas and sizes_ok, str(detail))
    pg.get_by_role("button", name=re.compile("Skip launch")).click(); wait_after_launch(pg)
    check("Robust: after resizing mid-launch, Skip still works and Mission Control opens", H1(pg) == "Mission Control", H1(pg))
    check("Robust: resizing mid-launch causes no error", unexpected(pg) == [], str(pg.errors[:2]))
    ctx.close()

    # <<SLICE-C-MARKER>> robustness checks are added above this line
    b.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
for n, _, d in fails: print("  FAILED:", n, d)
sys.exit(1 if fails else 0)
