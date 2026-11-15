#!/usr/bin/env python3
"""Browser audit for the Phase 3 build (real Chromium via Playwright).

Usage:   npm run build && npx vite preview --port 4173 &   then   python3 scripts/browser-audit.py
Needs:   pip install playwright && playwright install chromium
Prints PASS/FAIL per check and writes screenshots to ./audit-shots/.
Not part of `npm run check` (it needs a browser); the Vitest suite covers the logic.

Phase 3 flow:  Title > Brief > Design Bay > Launch > Mission Control (storm decision) > Outcome > Rewind > Diff
"""
import os, re, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:4173")
SHOTS = "audit-shots"
os.makedirs(SHOTS, exist_ok=True)
results = []

def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS  " if ok else "FAIL  ") + name + (f"  [{detail}]" if detail else ""), flush=True)

def new_page(b, w=1280, h=1000, reduced=False):
    ctx = b.new_context(viewport={"width": w, "height": h}, reduced_motion="reduce" if reduced else "no-preference")
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append("pageerror: " + str(e)))
    pg.on("console", lambda m: pg.errors.append("console.error: " + m.text) if m.type == "error" else None)
    return ctx, pg

def to_design(pg, seed=42):
    pg.goto(f"{BASE}/?seed={seed}")
    pg.get_by_role("button", name="Start mission").click()
    pg.get_by_role("button", name="Open the Design Bay").click()

def pick(pg, names):
    for n in names:
        pg.get_by_label(n, exact=False).first.check()

def launcher(pg, name):
    pg.get_by_label(name, exact=False).first.check()

def build(pg, ids, vehicle, battery=150, array=200):
    """A design exactly as a player builds it: tick instruments, choose the launcher, set sliders, Auto-size fuel."""
    pick(pg, ids)
    launcher(pg, vehicle)
    pg.get_by_label("Battery", exact=False).first.fill(str(battery))
    pg.get_by_label("Solar array", exact=False).first.fill(str(array))
    pg.get_by_role("button", name="Auto-size fuel").click()
    pg.wait_for_timeout(250)

def skip_launch(pg):
    pg.get_by_role("button", name="Launch", exact=True).click()
    pg.wait_for_selector("button:has-text('Skip launch')")
    pg.get_by_role("button", name=re.compile("Skip launch")).click()

def wait_after_launch(pg, timeout=30000):
    """After the launch animation: Mission Control (a storm to decide) or, for a failed launch, the outcome."""
    pg.wait_for_selector("button:has-text('Skip to the storm decision'), button:has-text('Change one decision')", timeout=timeout)

def finish_mission(pg, response="Ride it out"):
    """Mission Control: jump to the storm decision, answer it, jump to the end, open the outcome.
    Works whether the mission is still ticking toward the storm or is ALREADY paused at it (an early storm
    pauses within a second, which hides the skip button but leaves it in the DOM)."""
    skip = pg.get_by_role("button", name=re.compile("Skip to the storm decision"))
    if skip.count():
        skip.click()
    if pg.locator("button:has-text('Skip to the storm decision')").count() or pg.get_by_text(re.compile("Paused before orbit")).count():
        pg.get_by_role("button", name=re.compile("Choose: " + response)).click()
        pg.get_by_role("button", name=re.compile("Skip to the end")).click()
        pg.get_by_role("button", name="See the outcome").click()
    pg.wait_for_selector("button:has-text('Change one decision')")

def launch_and_finish(pg, response="Ride it out"):
    skip_launch(pg); wait_after_launch(pg); finish_mission(pg, response)

LIGHT3 = ["Imaging camera", "Spectrometer", "Magnetometer"]
RADAR3 = ["Radar sounder", "Spectrometer", "Magnetometer"]
A3 = ["Imaging camera", "Spectrometer", "Thermal"]          # tier recipes (see tests/sim/tiers.test.ts)

def tap_violations(pg):
    return pg.evaluate("""() => {
      const out = [];
      const sel = 'button, a[href], input, select, summary, [role=button], [role=link]';
      for (const el of document.querySelectorAll(sel)) {
        if (el.closest('[hidden]')) continue;
        let r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (el.classList.contains('skip-link') && r.top < 0) continue;
        if ((el.type === 'checkbox' || el.type === 'radio')) {
          const host = el.closest('label, .card, .choice');
          if (host) r = host.getBoundingClientRect();
        }
        if (r.width === 0 || r.height === 0) continue;
        if (r.width < 43.5 || r.height < 43.5) {
          out.push((el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
      }
      return out;
    }""")

def overflow(pg):
    return pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])

    # ---------------------------------------------------------------- 1. Design Bay content (incl. data and storage)
    ctx, pg = new_page(b)
    to_design(pg)
    cards = pg.evaluate("() => [...document.querySelectorAll('.card')].map(c => ({t: c.innerText, n: (c.querySelector('dl')?.innerText.match(/\\d+/g) || []).length, tag: !!c.querySelector('.tag')}))")
    check("Design Bay: 6 instrument + 3 launcher cards", len(cards) == 9, str(len(cards)))
    check("Every card shows Benefit, Cost and Why", all(("Benefit" in c["t"] and "Cost" in c["t"]) for c in cards))
    check("Each card shows at most 2 numbers by default (Benefit/Cost)", all(c["n"] <= 2 for c in cards), str([c["n"] for c in cards]))
    check("Every card carries a model label chip", all(c["tag"] for c in cards))
    meters = pg.evaluate("() => [...document.querySelectorAll('.meter')].map(m => ({id: m.dataset.meter, tags: [...m.querySelectorAll('.tag')].map(t => t.textContent.trim())}))")
    ids = [m["id"] for m in meters]
    check("Six live meters (mass, power, data, fuel, cost, science)", sorted(ids) == sorted(["mass", "power", "data", "fuel", "cost", "science"]), str(ids))
    check("Every meter shows GAME MODEL or SIMPLIFIED PHYSICS", all(any(t in ("GAME MODEL", "SIMPLIFIED PHYSICS") for t in m["tags"]) for m in meters))
    data_m = next(m for m in meters if m["id"] == "data")
    check("Data meter is labelled GAME MODEL (no real-world claim)", "GAME MODEL" in data_m["tags"], str(data_m["tags"]))
    fuel = next(m for m in meters if m["id"] == "fuel")
    check("Fuel meter (uses placeholders P1-P4) shows an unverified-placeholder badge", any("nverified" in t for t in fuel["tags"]), str(fuel["tags"]))
    labels = pg.evaluate("() => [...document.querySelectorAll('input[type=range]')].map(i => i.labels?.[0]?.textContent?.trim())")
    check("Four sliders (battery, array, fuel, data storage) + Auto-size button", labels == ["Battery", "Solar array", "Fuel", "Data storage"] and pg.get_by_role("button", name="Auto-size fuel").count() == 1, str(labels))
    pg.get_by_role("button", name="Engineering detail").click()
    drawer = pg.evaluate("() => document.body.innerText")
    check("Engineering detail drawer opens (non-modal) with full numbers", "Speed change available" in drawer and "Engine efficiency" in drawer and pg.locator("[role=dialog],dialog").count() == 0)
    check("Drawer carries the unverified-placeholder badge", "unverified placeholder" in drawer.lower())
    check("No console errors on Design Bay", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- 2. Threads (incl. the data channel)
    for reduced in (False, True):
        ctx, pg = new_page(b, reduced=reduced)
        to_design(pg)
        pick(pg, ["Spectrometer"])
        pg.wait_for_timeout(300)   # threads are debounced 180 ms after the last change
        info = pg.evaluate("""() => ({
          threads: [...document.querySelectorAll('svg.threads .thread')].map(g => ({ch: g.dataset.channel, dash: g.querySelector('.thread-line')?.getAttribute('stroke-dasharray'), color: g.querySelector('.thread-line')?.getAttribute('stroke'), icon: !!g.querySelector('.thread-badge path')})),
          reveal: (() => { const e = document.querySelector('.thread-reveal'); if (!e) return null; const s = getComputedStyle(e); return [s.animationDuration, s.animationTimingFunction]; })(),
          changed: document.querySelectorAll('.meter--changed').length,
          overlayHidden: document.querySelector('svg.threads')?.getAttribute('aria-hidden')
        })""")
        if not reduced:
            chans = [t["ch"] for t in info["threads"]]
            check("Threads: one drawn per meter the choice moved (>=2)", len(info["threads"]) >= 2, str(chans))
            check("Threads: an instrument also moves the data meter", "data" in chans, str(chans))
            check("Threads: 300 ms ease-out draw", info["reveal"] and info["reveal"][0] == "0.3s" and info["reveal"][1] == "ease-out", str(info["reveal"]))
            dashes = {t["ch"]: t["dash"] for t in info["threads"]}
            check("Threads: channel encoded by icon + line pattern + colour", all(t["icon"] for t in info["threads"]) and len(set(map(str, dashes.values()))) == len(dashes) and len({t["color"] for t in info["threads"]}) == len(info["threads"]), str(dashes))
            check("Threads overlay is aria-hidden (meters carry the text)", info["overlayHidden"] == "true")
            pg.wait_for_timeout(2700)
            check("Threads fade away after ~2 s", pg.locator("svg.threads .thread").count() == 0)
            pg.get_by_label("Data storage", exact=False).first.fill("220")
            pg.wait_for_timeout(300)
            chans2 = pg.evaluate("() => [...document.querySelectorAll('svg.threads .thread')].map(g => g.dataset.channel)")
            check("Threads: the storage slider links to the data and cost meters", "data" in chans2 and "cost" in chans2, str(chans2))
        else:
            check("Reduced motion: no animated threads", len(info["threads"]) == 0)
            check("Reduced motion: instant highlight on moved meters", info["changed"] >= 1, f"{info['changed']} meters")
        check(f"No console errors ({'reduced' if reduced else 'normal'} motion)", not pg.errors, str(pg.errors[:2]))
        ctx.close()

    # ---------------------------------------------------------------- 3. Validation (never a modal)
    ctx, pg = new_page(b)
    to_design(pg)
    pick(pg, ["Radar sounder", "Laser altimeter", "Spectrometer"])
    pg.get_by_role("button", name="Auto-size fuel").click()
    pg.wait_for_timeout(250)
    v = pg.locator(".validity").inner_text()
    check("Invalid design: 'Cannot launch because' with reasons", "Cannot launch because" in v and "lifts at most" in v, v.replace("\n", " ")[:120])
    check("Invalid design: shows 'How to fix it' list", "How to fix it" in v)
    check("Validation is inline, never a modal", pg.locator("[role=dialog],[role=alertdialog],dialog,.modal").count() == 0)
    la = pg.get_by_role("button", name="Launch", exact=True).get_attribute("aria-disabled")
    check("Launch button is aria-disabled (still focusable)", la == "true", str(la))
    pg.get_by_role("button", name="Launch", exact=True).click(force=True)
    pg.wait_for_timeout(250)
    on_design = pg.locator("h1:has-text('Design Bay')").count() == 1
    focus_in_validity = pg.evaluate("() => !!document.activeElement?.closest('.validity')")
    check("Pressing Launch on an invalid design stays put and moves focus to the reasons", on_design and focus_in_validity, f"design={on_design} focus_in_validity={focus_in_validity}")
    pg.get_by_label("Magnetometer", exact=False).first.click(force=True)
    n_sel = pg.evaluate("() => [...document.querySelectorAll('input[type=checkbox]')].filter(i => i.checked).length")
    check("A 4th instrument is refused (still 3 chosen)", n_sel == 3, str(n_sel))
    # Too little storage is also explained inline, not by a modal.
    launcher(pg, "Medium launcher")
    pg.wait_for_timeout(200)
    v2 = pg.locator(".validity").inner_text()
    check("Switching to Medium launcher clears the capacity problem", "lifts at most" not in v2, v2.replace("\n", " ")[:140])
    ctx.close()

    # ---------------------------------------------------------------- 4. Auto-size fuel
    ctx, pg = new_page(b)
    to_design(pg)
    pick(pg, LIGHT3)
    pg.get_by_label("Fuel", exact=False).first.fill("20")
    pg.get_by_role("button", name="Auto-size fuel").click()
    pg.wait_for_timeout(200)
    after = pg.get_by_label("Fuel", exact=False).first.input_value()
    fuel_text = pg.locator(".meter[data-meter=fuel] .meter-text").inner_text()
    check("Auto-size fuel sets propellant for a ~15% margin", after != "20" and re.search(r"\+1[5-7]%", fuel_text) is not None, f"20->{after}; {fuel_text}")
    ctx.close()

    # ---------------------------------------------------------------- 5. Launch: skip by button, Space, Enter + duration
    for how in ("button", "Space", "Enter"):
        ctx, pg = new_page(b)
        to_design(pg, 1); build(pg, A3, "Medium launcher", 150, 320)
        pg.get_by_role("button", name="Launch", exact=True).click()
        pg.wait_for_selector("button:has-text('Skip launch')")
        pg.wait_for_timeout(800)
        t0 = time.perf_counter()
        if how == "button":
            pg.get_by_role("button", name=re.compile("Skip launch")).click()
        else:
            pg.evaluate("() => document.activeElement && document.activeElement.blur && document.activeElement.blur()")
            pg.keyboard.press(how)
        wait_after_launch(pg, 4000)
        check(f"Launch skips with {how}", time.perf_counter() - t0 < 2.5, f"{time.perf_counter()-t0:.1f}s")
        ctx.close()

    for label, seed, vehicle, reduced in (("success", 1, "Medium launcher", False), ("failure (seed 16, Medium)", 16, "Medium launcher", False), ("reduced motion", 1, "Medium launcher", True)):
        ctx, pg = new_page(b, reduced=reduced)
        to_design(pg, seed); build(pg, A3, vehicle, 150, 320)
        pg.get_by_role("button", name="Launch", exact=True).click()
        t0 = time.perf_counter()
        pg.wait_for_selector("button:has-text('Skip launch')")
        wait_after_launch(pg, 30000)
        d = time.perf_counter() - t0
        check(f"Launch lasts 8-12 s ({label})", 8.0 <= d <= 12.0, f"{d:.1f}s")
        if "failure" in label:
            h1 = pg.locator("h1").first.inner_text()
            check("Failed launch plays a different, non-bare outcome, and skips Mission Control", "Launch failure" in h1 and pg.locator("button:has-text('Skip to the storm decision')").count() == 0, h1)
        ctx.close()

    # ---------------------------------------------------------------- 6. Mission Control: pacing, storm warning, three responses
    for reduced in (False, True):
        ctx, pg = new_page(b, reduced=reduced)
        tag = " (reduced motion)" if reduced else ""
        to_design(pg, 1); build(pg, A3, "Medium launcher", 150, 320)
        skip_launch(pg); wait_after_launch(pg)
        t0 = time.perf_counter()
        check(f"Launch leads to Mission Control, not straight to the outcome{tag}", pg.locator("h1").first.inner_text() == "Mission Control")
        if not reduced:
            pg.wait_for_selector(".screen--mission[data-phase='deciding']", timeout=10000)
            t_dec = time.perf_counter() - t0
            check("Orbits tick about every 0.5 s: the storm warning (orbit 7) arrives after ~3 s", 2.4 <= t_dec <= 4.8, f"{t_dec:.1f}s")
            cells = pg.evaluate("() => [...document.querySelectorAll('.orbit-cell[data-status]')].map(c => ({t: c.innerText, i: !!c.querySelector('svg')}))")
            check("Orbit cells say their status in words and with an icon", len(cells) == 6 and all(re.search(r"OK|Safe mode|Storage full", c["t"]) and c["i"] for c in cells), str(len(cells)))
            panel = pg.evaluate("() => [...document.querySelectorAll('.response')].map(r => ({id: r.dataset.response, t: r.innerText}))")
            check("Storm warning offers exactly three responses", [r["id"] for r in panel] == ["ride-out", "shed-heaviest", "safe-mode"], str([r["id"] for r in panel]))
            check("Each response shows Costs, Risks and Power with model labels", all(all(w in r["t"] for w in ("Costs", "Risks", "Power", "GAME MODEL")) for r in panel))
            check("No response is recommended", all(re.search(r"recommend|best choice|safest|optimal", r["t"], re.I) is None for r in panel))
            focus_id = pg.evaluate("() => document.activeElement && document.activeElement.id")
            check("Focus moves to the storm warning heading", focus_id == "storm-title", str(focus_id))
            live = pg.evaluate("() => document.getElementById('live').textContent")
            check("The warning is announced in the live region", "Solar storm warning" in live, live)
            pg.screenshot(path=f"{SHOTS}/mission-decision.png", full_page=True)
            check("Mission Control draws no console errors", not pg.errors, str(pg.errors[:2]))
            # Pause stops the clock.
            pg.get_by_role("button", name=re.compile("Choose: Ride it out")).click()
            pg.wait_for_timeout(600)
            before = pg.evaluate("() => document.querySelector('.screen--mission').dataset.revealed")
            pg.get_by_role("button", name="Pause").click()
            pg.wait_for_timeout(1500)
            after = pg.evaluate("() => document.querySelector('.screen--mission').dataset.revealed")
            check("Pause stops the orbits; Resume restarts them", before == after and pg.get_by_role("button", name="Resume").count() == 1, f"{before}->{after}")
            pg.get_by_role("button", name="Resume").click()
        else:
            pg.get_by_role("button", name=re.compile("Skip to the storm decision")).click()
            pg.get_by_role("button", name=re.compile("Choose: Ride it out")).click()
        pg.wait_for_selector("button:has-text('See the outcome')", timeout=30000)
        total = time.perf_counter() - t0
        check(f"Whole Mission Control phase takes <= 45 s{tag}", total <= 45.0, f"{total:.1f}s")
        if not reduced:
            pg.screenshot(path=f"{SHOTS}/mission-finished.png", full_page=True)
        pg.get_by_role("button", name="See the outcome").click()
        pg.wait_for_selector("button:has-text('Change one decision')")
        ctx.close()

    # ---------------------------------------------------------------- 7. Outcome: scores v2 + top-3 causes as chains
    ctx, pg = new_page(b)
    to_design(pg, 42); pick(pg, RADAR3)
    launch_and_finish(pg, "Ride it out")
    out = pg.evaluate("() => document.querySelector('main').innerText")
    chains = pg.evaluate("() => [...document.querySelectorAll('.chain')].map(e => e.innerText.replace(/\\s+/g, ' ').trim())")
    h1 = pg.locator("h1").first.inner_text()
    check("Outcome: tier heading", re.search(r"Landmark|Success|Recovered|Partial|failure", h1, re.I) is not None, h1)
    check("Outcome: 1-3 cause chains", 1 <= len(chains) <= 3, str(len(chains)))
    check("Outcome: the first chain starts from a decision of yours and ends in an event", bool(chains) and re.search(r"Radar|Spectrometer|Magnetometer|Battery|Solar array|Storage|launcher|Ride it out|Switch off|safe mode", chains[0], re.I) is not None, chains[0][:200] if chains else "none")
    check("Outcome shows all four scores", all(s in out for s in ("Science collected", "Data returned", "Spacecraft health", "Budget margin")))
    check("Outcome names the storm and the response", re.search(r"Solar storm on orbit \d+", out) is not None and re.search(r"You chose|No response", out) is not None)
    check("Chains carry a model label", "SIMPLIFIED PHYSICS" in out or "GAME MODEL" in out)
    pg.screenshot(path=f"{SHOTS}/outcome-storm.png", full_page=True)

    # ---------------------------------------------------------------- 8. Rewind (design) + diff
    pg.get_by_role("button", name="Change one decision").click()
    pg.wait_for_selector("h1:has-text('Design Bay')")
    banner = pg.locator(".rewind").inner_text()
    check("Rewind returns to the Design Bay with the same seed shown", "seed" in banner.lower() and "42" in banner, banner.replace("\n", " ")[:140])
    check("Rewind offers the storm response as something you can change", pg.locator("input[name=storm-response]").count() == 3)
    # In rewind mode a storm-response radio is also labelled "Switch off the Radar sounder", so target the checkboxes by role.
    pg.get_by_role("checkbox", name=re.compile("Radar sounder")).uncheck()
    pg.get_by_role("checkbox", name=re.compile("Imaging camera")).check()
    pg.get_by_role("button", name="Auto-size fuel").click()
    pg.wait_for_timeout(200)
    banner2 = pg.locator(".rewind").inner_text()
    check("Rewind banner counts what you changed", re.search(r"\b2\b|two", banner2) is not None or "change" in banner2.lower(), banner2.replace("\n", " ")[:160])
    pg.get_by_role("button", name="Run the mission again").click()
    pg.wait_for_selector("h1:has-text('Compared')", timeout=8000)
    diff = pg.evaluate("() => document.querySelector('main').innerText")
    check("Diff shows tier before -> after", re.search(r"Outcome\s*\S.* to \S", diff) is not None, diff.replace("\n", " ")[:160])
    check("Diff shows science, data, health and budget rows", all(s in diff for s in ("Science collected", "Data returned", "Spacecraft health", "Budget margin")))
    check("Diff lists what vanished / appeared (events)", "Problems that went away" in diff and "New problems" in diff)
    check("Diff lists the decisions that changed", re.search(r"Radar|Imaging", diff) is not None)
    check("Seed unchanged across the rewind", "42" in diff)
    pg.screenshot(path=f"{SHOTS}/diff.png", full_page=True)
    check("No console errors through the loop", not pg.errors, str(pg.errors[:2]))
    ctx.close()

    # ---------------------------------------------------------------- 9. Tier recipes through the real UI (seeds listed in tests/sim/tiers.test.ts)
    B3 = ["Imaging camera", "Spectrometer", "Magnetometer"]
    recipes = [
        ("Landmark", 2, B3, "Ride it out", r"Landmark mission"),
        ("Success", 2, A3, "Ride it out", r"Success:"),
        ("Recovered", 29, A3, "Switch off the", r"Recovered:"),
        ("Partial", 1, A3, "Ride it out", r"Partial success"),
        ("Lost with Lessons", 16, A3, "Ride it out", r"Launch failure"),
    ]
    for tier, seed, ids, response, heading in recipes:
        ctx, pg = new_page(b)
        to_design(pg, seed); build(pg, ids, "Medium launcher", 150, 320)
        launch_and_finish(pg, response)
        h1 = pg.locator("h1").first.inner_text()
        check(f"Tier {tier}: seed {seed}, '{response}' gives the '{heading}' outcome", re.search(heading, h1) is not None, h1)
        if tier == "Recovered":
            pg.screenshot(path=f"{SHOTS}/tier-recovered.png", full_page=True)
        ctx.close()

    # ---------------------------------------------------------------- 10. Rewind that changes ONLY the storm response
    ctx, pg = new_page(b)
    to_design(pg, 29); build(pg, A3, "Medium launcher", 150, 320)
    launch_and_finish(pg, "Ride it out")
    before_tier = pg.locator("h1").first.inner_text()
    pg.get_by_role("button", name="Change one decision").click()
    pg.wait_for_selector("h1:has-text('Design Bay')")
    pg.locator("input[name=storm-response][value=shed-heaviest]").check()
    pg.get_by_role("button", name="Run the mission again").click()
    pg.wait_for_selector("h1:has-text('Compared')", timeout=8000)
    diff = pg.evaluate("() => document.querySelector('main').innerText")
    check("Response-only rewind: the diff lists the storm response and nothing else as changed", "Storm response" in diff and "Instrument added" not in diff and "Instrument removed" not in diff and "Launcher" not in diff.split("What happened differently")[0], diff.replace("\n", " ")[:200])
    check("Response-only rewind: Partial becomes Recovered", "Partial" in before_tier and re.search(r"Partial\s*to\s*Recovered", diff.replace("\n", " ")) is not None, before_tier)
    pg.screenshot(path=f"{SHOTS}/diff-response-only.png", full_page=True)
    ctx.close()

    # ---------------------------------------------------------------- 11. Keyboard-only full loop (incl. Mission Control)
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?seed=1")

    def focus_name():
        return pg.evaluate("""() => { const e = document.activeElement; if (!e) return '';
          let n = e.getAttribute('aria-label') || '';
          const lb = e.getAttribute('aria-labelledby');
          if (!n && lb) n = lb.split(' ').map(i => document.getElementById(i)?.textContent || '').join(' ');
          if (!n && e.labels && e.labels[0]) n = e.labels[0].textContent;
          if (!n && e !== document.body) n = e.textContent || e.name || '';
          return n.trim().replace(/\\s+/g, ' '); }""")

    def tab_to(pattern, limit=140):
        for _ in range(limit):
            if re.search(pattern, focus_name(), re.I):
                return True
            pg.keyboard.press("Tab")
        return False

    steps = []
    def kb(pattern, key="Enter"):
        ok = tab_to(pattern)
        steps.append((pattern, ok))
        if ok: pg.keyboard.press(key)
        return ok

    def kb_radio(group_pattern, target, limit=4):
        """Radio groups: Tab lands on the checked radio; ArrowDown moves (and selects) within the group."""
        ok = tab_to(group_pattern)
        if ok:
            for _ in range(limit):
                if re.search(target, focus_name(), re.I):
                    break
                pg.keyboard.press("ArrowDown")
            ok = re.search(target, focus_name(), re.I) is not None
        steps.append((target, ok))
        return ok

    kb(r"^Start mission")
    pg.wait_for_selector("h1:has-text('Mission brief')")
    kb(r"Open the Design Bay")
    pg.wait_for_selector("h1:has-text('Design Bay')")
    for n in ("Imaging camera", "Spectrometer", "Thermal"):
        kb(n, "Space")
    kb_radio(r"(Light|Medium|Heavy) launcher", r"Medium launcher")   # native radio group: Tab reaches the checked one, arrows move
    ok_sl = tab_to(r"^Solar array", 40)
    if ok_sl:
        for _ in range(12): pg.keyboard.press("ArrowRight")
    steps.append(("array slider by keyboard", ok_sl))
    kb(r"Auto-size fuel")
    kb(r"^Launch$")
    pg.wait_for_selector("button:has-text('Skip launch')")
    pg.wait_for_timeout(600)
    pg.evaluate("() => document.activeElement && document.activeElement.blur()")
    pg.keyboard.press("Space")
    wait_after_launch(pg, 4000)
    kb(r"Skip to the storm decision")
    kb(r"Choose: Ride it out")
    kb(r"Skip to the end")
    kb(r"See the outcome")
    pg.wait_for_selector("button:has-text('Change one decision')")
    kb(r"Change one decision")
    pg.wait_for_selector("h1:has-text('Design Bay')")
    kb_radio(r"Ride it out|Switch off|Safe mode early", r"Safe mode early")   # change one decision: only the storm response
    kb(r"^Run the mission again$")
    done = False
    try:
        pg.wait_for_selector("h1:has-text('Compared')", timeout=6000); done = True
    except Exception:
        pass
    check("Keyboard only: Title > Brief > Design > Launch > Mission Control > Outcome > Rewind > Diff", done and all(ok for _, ok in steps), str([s for s in steps if not s[1]]))
    pg.goto(f"{BASE}/?seed=1")
    pg.keyboard.press("Tab"); pg.keyboard.press("Tab")
    ring = pg.evaluate("() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, parseFloat(s.outlineWidth)]; }")
    check("Visible focus ring (>=2px outline) on keyboard focus", ring[0] != "none" and ring[1] >= 2, str(ring))
    ctx.close()

    # ---------------------------------------------------------------- 12. Touch targets + layout at three viewports (incl. Mission Control)
    for (w, h, name) in ((1280, 1000, "desktop"), (820, 1180, "tablet"), (390, 844, "phone")):
        ctx, pg = new_page(b, w, h)
        bad = {}
        pg.goto(f"{BASE}/?seed=1")
        bad["title"] = tap_violations(pg)
        pg.screenshot(path=f"{SHOTS}/{name}-title.png", full_page=True)
        pg.get_by_role("button", name="Start mission").click()
        bad["brief"] = tap_violations(pg)
        pg.get_by_role("button", name="Open the Design Bay").click()
        build(pg, A3, "Medium launcher", 150, 320)
        pg.get_by_role("button", name="Engineering detail").click()
        bad["design"] = tap_violations(pg)
        ov = overflow(pg)
        pg.screenshot(path=f"{SHOTS}/{name}-design.png", full_page=True)
        skip_launch(pg); wait_after_launch(pg)
        bad["mission-running"] = tap_violations(pg)
        pg.get_by_role("button", name=re.compile("Skip to the storm decision")).click()
        bad["mission-decision"] = tap_violations(pg)
        ov_m = overflow(pg)
        pg.screenshot(path=f"{SHOTS}/{name}-mission.png", full_page=True)
        pg.get_by_role("button", name=re.compile("Choose: Ride it out")).click()
        pg.get_by_role("button", name=re.compile("Skip to the end")).click()
        bad["mission-finished"] = tap_violations(pg)
        pg.get_by_role("button", name="See the outcome").click()
        pg.wait_for_selector("button:has-text('Change one decision')")
        bad["outcome"] = tap_violations(pg)
        ov2 = overflow(pg)
        pg.screenshot(path=f"{SHOTS}/{name}-outcome.png", full_page=True)
        flat = {k: v for k, v in bad.items() if v}
        check(f"Touch targets >= 44 px on every screen ({name} {w}px)", not flat, str(flat)[:300])
        check(f"No horizontal scroll ({name} {w}px)", ov <= 1 and ov_m <= 1 and ov2 <= 1, f"design +{ov}px, mission +{ov_m}px, outcome +{ov2}px")
        check(f"No console errors ({name})", not pg.errors, str(pg.errors[:2]))
        ctx.close()
    b.close()

fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
for n, _, d in fails: print("  FAILED:", n, d)
sys.exit(1 if fails else 0)
