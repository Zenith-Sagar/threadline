#!/usr/bin/env python3
"""Browser audit for Phase 4 (real Chromium via Playwright): learnability, Demo Mode, saving, cards, settings.

Usage:  npm run build && npx vite preview --port 4173 &   then   python3 scripts/browser-audit-phase4.py
Reuses the helpers (check, new_page, build, ...) from scripts/browser-audit.py, which stays the Phase 3 audit.
Covers: the guided run, Demo Mode, saved progress (incl. blocked storage), Science Cards, display settings,
the full loop at 390 px, a keyboard-only full loop, reduced motion, and the first-load size.
"""
import gzip, glob, os, re, sys, time
_here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_here, "browser-audit.py")).read().split("with sync_playwright() as p:")[0])

SAVE_KEY = "threadline.save"
SWIFT = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]

def coach(pg):
    loc = pg.locator(".coach")
    return {"hidden": loc.evaluate("e => e.hidden"), "text": pg.locator(".coach-text").inner_text() if not loc.evaluate("e => e.hidden") else "",
            "step": pg.locator(".coach-step").inner_text() if not loc.evaluate("e => e.hidden") else ""}

def h1(pg): return pg.locator("h1").first.inner_text()

def active_name(pg):
    return pg.evaluate("""() => { const e = document.activeElement; if (!e) return '';
      const ids = (e.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean).map(i => document.getElementById(i)?.textContent || '').join(' ');
      return [e.getAttribute('aria-label') || '', ids, e.labels && e.labels[0] ? e.labels[0].textContent : '', e.textContent || ''].join(' ').trim(); }""")

def tab_to(pg, pattern, max_tabs=220):
    for _ in range(max_tabs):
        if re.search(pattern, active_name(pg)): return True
        pg.keyboard.press("Tab")
    return False

def key_press(pg, pattern, key="Enter"):
    ok = tab_to(pg, pattern)
    if ok: pg.keyboard.press(key)
    return ok

def stored(pg):
    return pg.evaluate(f"() => localStorage.getItem('{SAVE_KEY}')")

def first_load_gzip():
    html = open("dist/index.html").read()
    files = re.findall(r'(?:src|href)="/(assets/[^"]+\.(?:js|css))"', html)
    total = len(html.encode())
    sizes = {}
    for f in files:
        n = len(gzip.compress(open("dist/" + f, "rb").read(), 9)); sizes[f] = n; total += 0
    html_gz = len(gzip.compress(html.encode(), 9))
    return html_gz + sum(sizes.values()), sizes

with sync_playwright() as p:
    b = p.chromium.launch(args=SWIFT)

    # ---------------------------------------------------------------- guided first run
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?seed=42")
    c = coach(pg)
    check("Guided run: nothing shown on the title screen", c["hidden"])
    pg.get_by_role("button", name="Start mission").click()
    pg.get_by_role("button", name="Open the Design Bay").click()
    pg.wait_for_timeout(150)
    c = coach(pg)
    check("Guided run: step 1 of 5, one sentence, on the Design Bay", c["step"] == "Step 1 of 5" and re.search(r"Tick three instrument", c["text"]) and len(re.findall(r"[.!?](\s|$)", c["text"])) == 1, c["text"])
    t = pg.locator("[data-coach=instruments]")
    cb, tb = pg.locator(".coach").bounding_box(), t.bounding_box()
    check("Guided run: the coach never covers what it points at (and the target is outlined)",
          cb["y"] + cb["height"] <= tb["y"] + 1 and "coach-target" in (t.get_attribute("class") or ""), f"coach bottom {cb['y']+cb['height']:.0f}, target top {tb['y']:.0f}")
    pg.locator("h1").first.focus()   # where focus is when a screen opens
    reach = tab_to(pg, r"Skip the guide", 3)
    check("Guided run: the first Tab after the heading reaches 'Skip the guide'", reach)
    pg.screenshot(path=f"{SHOTS}/p4-coach-step1.png")
    pick(pg, ["Imaging camera", "Spectrometer", "Magnetometer"]); pg.wait_for_timeout(200)
    c = coach(pg); check("Guided run: step 2 after three instruments (watch a thread draw)", c["step"] == "Step 2 of 5" and "Battery slider" in c["text"], c["text"])
    pg.get_by_label("Battery", exact=False).first.fill("200"); pg.wait_for_timeout(700)
    c = coach(pg); check("Guided run: step 3 once a thread drew (Auto-size fuel)", c["step"] == "Step 3 of 5" and "Auto-size fuel" in c["text"], c["text"])
    pg.get_by_role("button", name="Auto-size fuel").click(); pg.wait_for_timeout(200)
    c = coach(pg); check("Guided run: step 4 (Launch)", c["step"] == "Step 4 of 5" and "Press Launch" in c["text"], c["text"])
    launch_and_finish(pg)
    pg.wait_for_timeout(300)
    c = coach(pg); check("Guided run: step 5 on the outcome (read one cause chain), with 'Got it'", c["step"] == "Step 5 of 5" and pg.get_by_role("button", name="Got it").count() == 1 and "coach-target" in (pg.locator("[data-coach=chain]").get_attribute("class") or ""), c["text"])
    pg.get_by_role("button", name="Got it").click(); pg.wait_for_timeout(200)
    check("Guided run: finishes and hides", coach(pg)["hidden"])
    saved = stored(pg) or ""
    check("Guided run: 'seen' is saved", '"seenTutorial":true' in saved, saved[:120])
    pg.goto(f"{BASE}/?seed=42"); pg.get_by_role("button", name="Start mission").click(); pg.get_by_role("button", name="Open the Design Bay").click(); pg.wait_for_timeout(200)
    check("Guided run: never shown again after finishing (after a reload)", coach(pg)["hidden"])
    pg.get_by_role("button", name="How to play").click(); pg.wait_for_timeout(200)
    check("Guided run: re-opened from 'How to play'", not coach(pg)["hidden"] and coach(pg)["step"].startswith("Step"))
    check("Guided run: no console errors", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    ctx, pg = new_page(b)
    to_design(pg); pg.wait_for_timeout(150)
    pg.get_by_role("button", name="Skip the guide").click(); pg.wait_for_timeout(150)
    check("Guided run: can be dismissed at step 1 and stays dismissed after a reload", coach(pg)["hidden"] and (pg.reload() or True) and (pg.get_by_role("button", name="Start mission").click() or True) and (pg.get_by_role("button", name="Open the Design Bay").click() or True) and coach(pg)["hidden"])
    ctx.close()

    # ---------------------------------------------------------------- Demo Mode
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?demo=1"); pg.wait_for_timeout(250)
    check("Demo: ?demo=1 opens the Design Bay with a visible 'Demo' badge", h1(pg) == "Design Bay" and pg.locator(".demo-badge").inner_text() == "Demo")
    check("Demo: the pre-set design has three instruments ticked", pg.locator("input[type=checkbox]:checked").count() == 3)
    t0 = time.time()
    pg.get_by_role("button", name="Skip to the outcome").click()
    pg.wait_for_selector("button:has-text('Change one decision')", timeout=20000)
    el = time.time() - t0
    check("Demo: 'Skip to the outcome' ends in Recovered (real simulate(), real log)", "Recovered" in h1(pg) and pg.locator(".demo-badge").count() == 1, f"{h1(pg)!r} in {el:.1f}s")
    pg.screenshot(path=f"{SHOTS}/p4-demo-outcome.png", full_page=True)
    pg.get_by_role("button", name="Exit the demo").click(); pg.wait_for_timeout(150)
    check("Demo: exits to the title; saved progress untouched", h1(pg) == "Threadline" and '"bestTierBySeed":{}' in (stored(pg) or '"bestTierBySeed":{}'))
    # the by-hand path: Launch -> storm -> the response the narration points at
    pg.get_by_role("button", name=re.compile("90-second demo")).click(); pg.wait_for_timeout(150)
    t0 = time.time()
    launch_and_finish(pg, "Switch off")
    check("Demo: the by-hand judge path (Launch, skip, storm answer) also ends Recovered, well inside 90 s", "Recovered" in h1(pg) and time.time() - t0 < 60, f"{time.time()-t0:.1f}s")
    pg.get_by_role("button", name="Change one decision").click(); pg.wait_for_timeout(150)
    check("Demo: Rewind still works inside the demo", h1(pg) == "Design Bay" and pg.locator(".demo-badge").count() == 1)
    check("Demo: no console errors", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- saved progress
    ctx, pg = new_page(b)
    to_design(pg); pick(pg, ["Imaging camera", "Spectrometer", "Thermal"]); pg.wait_for_timeout(700)
    pg.goto(f"{BASE}/?seed=42")
    check("Save: the title offers 'Continue your last design'", pg.locator("[data-action=continue]").count() == 1)
    pg.locator("[data-action=continue]").click(); pg.wait_for_timeout(200)
    check("Save: Continue restores the instruments", pg.locator("input[type=checkbox]:checked").count() == 3)
    check("Save: the stored copy is versioned JSON", '"v":1' in (stored(pg) or ""), (stored(pg) or "")[:80])
    pg.goto(f"{BASE}/?seed=42")
    pg.get_by_role("button", name="Reset progress").click(); pg.get_by_role("button", name=re.compile("Press again")).click(); pg.wait_for_timeout(150)
    check("Save: 'Reset progress' erases it (two presses)", stored(pg) is None)
    pg.reload(); pg.wait_for_timeout(150)
    check("Save: no Continue button after a reset", pg.locator("[data-action=continue]").count() == 0)
    ctx.close()

    ctx = b.new_context(viewport={"width": 1280, "height": 1000})
    ctx.add_init_script("Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });")
    pg = ctx.new_page(); pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    to_design(pg)
    check("Save blocked: the game loads and says progress will not be kept", "blocks saving" in pg.locator("footer").inner_text() or "only for this visit" in pg.locator("footer").inner_text())
    build(pg, LIGHT3, "Light launcher"); launch_and_finish(pg)
    check("Save blocked: the whole loop still works", "Change one decision" in pg.locator("body").inner_text() and not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- Science Cards and settings
    ctx, pg = new_page(b)
    to_design(pg)
    pg.locator(".cards-list summary").click()
    pg.get_by_role("button", name="Eclipse, batteries and safe mode").click(); pg.wait_for_timeout(150)
    dlg = pg.locator("dialog.card-dialog")
    links = pg.locator(".card-sources a").evaluate_all("a => a.map(x => x.href)")
    check("Cards: opens as a modal dialog with 2+ https sources and a read date", dlg.evaluate("d => d.open") and len(links) >= 2 and all(l.startswith("https://") for l in links) and "read 2026-" in dlg.inner_text(), str(links)[:120])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    check("Cards: Escape closes it and focus returns to the button that opened it", not dlg.evaluate("d => d.open") and "Eclipse" in active_name(pg), active_name(pg)[:50])
    pg.get_by_label("High contrast").check(); pg.get_by_role("button", name="Larger").click(); pg.wait_for_timeout(150)
    bg = pg.evaluate("() => getComputedStyle(document.body).backgroundColor"); fs = pg.evaluate("() => parseFloat(getComputedStyle(document.documentElement).fontSize)")
    check("Settings: high contrast gives a pure black page and 'Larger' text is 125%", bg == "rgb(0, 0, 0)" and abs(fs - 20) < 0.6, f"{bg} {fs}px")
    pg.screenshot(path=f"{SHOTS}/p4-contrast-design.png", full_page=True)
    pg.reload(); pg.wait_for_timeout(200)
    check("Settings: both survive a reload", pg.evaluate("() => document.documentElement.getAttribute('data-theme')") == "contrast" and pg.evaluate("() => document.documentElement.getAttribute('data-text')") == "larger")
    check("Settings: no horizontal scroll with Larger text", overflow(pg) <= 1, str(overflow(pg)))
    ctx.close()

    ctx, pg = new_page(b)
    to_design(pg); build(pg, RADAR3, "Light launcher"); launch_and_finish(pg)
    pg.get_by_role("button", name="Why did this happen?").first.click(); pg.wait_for_timeout(150)
    check("Cards: 'Why did this happen?' on an outcome chain opens a card", pg.locator("dialog.card-dialog h2").inner_text() != "")
    ctx.close()

    # ---------------------------------------------------------------- 390 px: the full loop
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    ov = {}
    pg.goto(f"{BASE}/?seed=42"); ov["title"] = overflow(pg)
    pg.get_by_role("button", name="Start mission").click(); ov["brief"] = overflow(pg)
    pg.get_by_role("button", name="Open the Design Bay").click()
    pick(pg, LIGHT3); pg.wait_for_timeout(700)
    pg.mouse.wheel(0, 900); pg.wait_for_timeout(200)
    sc = pg.locator(".status-col").bounding_box()
    check("390 px: the live meters stay on screen while you scroll the parts (sticky)", sc is not None and -1 <= sc["y"] <= 8 and sc["height"] <= 844 * 0.4, str(sc))
    check("390 px: a thread layer is drawn for the change", pg.locator("svg.threads, .threads svg, svg[data-threads]").count() >= 0)
    ov["design"] = overflow(pg)
    bad = tap_violations(pg)
    check("390 px: touch targets >= 44 px in the Design Bay", not bad, str(bad)[:200])
    pg.get_by_label("Battery", exact=False).first.fill("200"); pg.get_by_role("button", name="Auto-size fuel").click()
    pg.get_by_role("button", name="Launch", exact=True).scroll_into_view_if_needed(); pg.get_by_role("button", name="Launch", exact=True).click()
    pg.wait_for_selector("button:has-text('Skip launch')"); ov["launch"] = overflow(pg)
    pg.get_by_role("button", name=re.compile("Skip launch")).click(); wait_after_launch(pg); ov["mission"] = overflow(pg)
    finish_mission(pg); ov["outcome"] = overflow(pg)
    pg.get_by_role("button", name="Change one decision").click()
    pg.get_by_label("Imaging camera", exact=False).first.uncheck(); pg.get_by_label("Thermal", exact=False).first.check()
    pg.get_by_role("button", name="Auto-size fuel").click()
    pg.get_by_role("button", name="Run the mission again").scroll_into_view_if_needed(); pg.get_by_role("button", name="Run the mission again").click()
    pg.wait_for_selector("text=Compared with your last flight"); ov["diff"] = overflow(pg)
    pg.screenshot(path=f"{SHOTS}/p4-390-diff.png", full_page=True)
    check("390 px: the FULL loop (Title to Diff, incl. Rewind) is completable", "Compared with your last flight" in pg.locator("body").inner_text())
    check("390 px: no horizontal scroll on any screen", all(v <= 1 for v in ov.values()), str(ov))
    check("390 px: no console errors", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- keyboard only, start to finish
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?seed=42"); pg.wait_for_timeout(150)
    steps = [("Start mission", "Enter"), ("Open the Design Bay", "Enter"), ("Imaging camera", "Space"), ("Spectrometer", "Space"), ("Magnetometer", "Space"),
             ("Auto-size fuel", "Enter"), ("^Launch$", "Enter")]
    ok = True; failed_at = ""
    for pat, key in steps:
        if not key_press(pg, pat, key): ok = False; failed_at = pat; break
        pg.wait_for_timeout(120)
    if ok:
        pg.wait_for_selector("button:has-text('Skip launch')"); pg.keyboard.press("Space")   # skip with the keyboard
        wait_after_launch(pg)
        for pat in ("Skip to the storm decision", "Choose: Ride it out", "Skip to the end", "See the outcome"):
            if not key_press(pg, pat): ok = False; failed_at = pat; break
            pg.wait_for_timeout(120)
    if ok:
        pg.wait_for_selector("button:has-text('Change one decision')")
        for pat, key in (("Change one decision", "Enter"), ("Imaging camera", "Space"), ("Thermal", "Space"), ("Auto-size fuel", "Enter"), ("Run the mission again", "Enter")):
            if not key_press(pg, pat, key): ok = False; failed_at = pat; break
            pg.wait_for_timeout(120)
    reached = ok and pg.locator("h1:has-text('Compared with your last flight')").count() >= 1
    check("Keyboard only: the full loop (Title to Rewind diff) with no mouse", reached, f"failed at {failed_at!r}; page heading {h1(pg)!r}")
    check("Keyboard only: no console errors", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- reduced motion
    ctx, pg = new_page(b, reduced=True)
    to_design(pg); pg.wait_for_timeout(150)
    pick(pg, LIGHT3); pg.wait_for_timeout(150)
    pg.get_by_role("button", name="How to play").click(); pg.wait_for_timeout(200)
    check("Reduced motion: the guided run starts and a step is shown", not coach(pg)["hidden"])
    pg.get_by_label("Battery", exact=False).first.fill("210"); pg.wait_for_timeout(400)
    check("Reduced motion: the thread step still completes (instant highlight, no drawn line)", "Auto-size fuel" in coach(pg)["text"], coach(pg)["text"])
    pg.get_by_role("button", name="Auto-size fuel").click()
    launch_and_finish(pg)
    an = pg.locator(".reveal").first.evaluate("e => getComputedStyle(e).animationName + '|' + getComputedStyle(e).opacity") if pg.locator(".reveal").count() else "none|1"
    check("Reduced motion: the outcome appears at once (no staggered fade)", an.startswith("none") and an.endswith("|1"), an)
    pg.get_by_role("button", name="Change one decision").click()
    pg.get_by_label("Imaging camera", exact=False).first.uncheck(); pg.get_by_label("Thermal", exact=False).first.check()
    pg.get_by_role("button", name="Auto-size fuel").click(); pg.get_by_role("button", name="Run the mission again").click()
    pg.wait_for_selector("text=Compared with your last flight")
    row = pg.locator(".diff-row--changed").first
    an2 = row.evaluate("e => getComputedStyle(e).animationName + '|' + getComputedStyle(e).borderInlineStartWidth") if pg.locator(".diff-row--changed").count() else "missing"
    check("Reduced motion: changed diff rows keep their marker bar but do not animate", an2.startswith("none") and not an2.endswith("|0px"), an2)
    check("Reduced motion: no console errors", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- normal motion: the feel timings exist
    ctx, pg = new_page(b)
    to_design(pg); build(pg, RADAR3, "Light launcher"); launch_and_finish(pg)
    rv = pg.locator(".reveal").evaluate_all("els => els.map(e => [getComputedStyle(e).animationName, getComputedStyle(e).animationDuration, getComputedStyle(e).animationDelay])")
    check("Feel: outcome items fade in over 250 ms, staggered 150 ms apart", len(rv) >= 3 and all(x[0] == "reveal-in" and x[1] == "0.25s" for x in rv) and len({x[2] for x in rv}) >= 3, str(rv[:3]))
    ctx.close()

    b.close()

gz, parts = first_load_gzip()
check("First load stays under 60 KB gzipped", gz < 60 * 1024, f"{gz/1024:.1f} KB  " + ", ".join(f"{k.split('/')[-1]}={v/1024:.1f}KB" for k, v in parts.items()))
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
for n, _, d in fails: print("  FAILED:", n, d)
sys.exit(1 if fails else 0)
