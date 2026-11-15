#!/usr/bin/env python3
"""Skeptical first-time judge: plays the full loop on every variant at 1280, 820 and 390 px (real Chromium).

    npm run build && npx vite preview --port 4173 &
    python3 scripts/judge-review.py [variant ...]        (default: all four)

For every screen it records: the visible words, a rough reading time (words / 200 words per minute, an ESTIMATE),
the reading grade (Flesch-Kincaid, a heuristic), long sentences, jargon that is NOT inside a glossary tooltip,
horizontal overflow, clipped text, tap targets under 44 px, console errors. Writes review/judge-review.json and
screenshots to review/shots/. It judges; it does not fix.
"""
import json, os, re, sys, time
_here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_here, "browser-audit.py")).read().split("with sync_playwright() as p:")[0])
OUT = "review"; SH = os.path.join(OUT, "shots"); os.makedirs(SH, exist_ok=True)
SWIFT = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
VARIANTS = {"standard": "Standard mission", "early-storm": "Early storm", "tight-budget": "Tight budget", "data-rich": "Data-rich target"}
WIDTHS = [1280, 820, 390]
JARGON = ["delta-v", "eclipse", "propellant", "downlink", "safe mode", "orbit insertion", "solar array", "Wh", "Mb", "seed",
          "Pareto", "telemetry", "Isp", "payload", "GAME MODEL", "SIMPLIFIED PHYSICS", "NASA DATA", "light delay", "radiation"]

def syll(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w: return 0
    n = len(re.findall(r"[aeiouy]+", w)) - (1 if w.endswith("e") and not w.endswith("le") else 0)
    return max(1, n)
def grade(text):
    sents = [s for s in re.split(r"(?<=[.!?])\s+", text) if len(s.split()) >= 3]
    words = re.findall(r"[A-Za-z']+", text)
    if not sents or not words: return None, []
    g = 0.39 * len(words) / len(sents) + 11.8 * sum(syll(w) for w in words) / len(words) - 15.59
    return round(g, 1), [s for s in sents if len(s.split()) > 28]

SNAP_JS = """() => {
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
  const clone = document.body.cloneNode(true);
  const termText = [...clone.querySelectorAll('.term')].map(t => t.textContent.trim().toLowerCase());
  clone.querySelectorAll('.term, script, style, .skip-link, footer, .tip').forEach(e => e.remove());
  const clipped = [...document.querySelectorAll('main *, .coach *')].filter(e => vis(e) && e.scrollWidth > e.clientWidth + 2 && ['hidden','clip'].includes(getComputedStyle(e).overflowX) && e.children.length === 0).map(e => e.textContent.trim().slice(0, 40));
  return { h1: (document.querySelector('h1') || {}).textContent || '', text: clone.innerText.replace(/\\s+/g, ' ').trim(), termText, clipped };
}"""

def snap(pg, rec, label, t0, w, v):
    d = pg.evaluate(SNAP_JS)
    words = len(d["text"].split())
    g, long_s = grade(d["text"])
    jar = sorted({j for j in JARGON if re.search(r"(?<![A-Za-z])" + re.escape(j) + r"(?![A-Za-z])", d["text"], re.I)})
    rec["screens"].append({"label": label, "t": round(time.time() - t0, 1), "h1": d["h1"].strip(), "words": words,
        "read_s": round(words / 200 * 60), "grade": g, "long_sentences": long_s[:3], "jargon_untooltipped": jar,
        "overflow_px": overflow(pg), "tap_small": tap_violations(pg)[:6], "clipped": d["clipped"][:4], "errors": list(pg.errors)})
    pg.screenshot(path=os.path.join(SH, f"{v}-{w}-{len(rec['screens']):02d}-{label}.png"), full_page=True)

def play(b, v, w):
    ctx, pg = new_page(b, w, 900 if w > 500 else 844)
    rec = {"variant": v, "width": w, "screens": [], "notes": []}; t0 = time.time()
    try:
        pg.goto(f"{BASE}/?seed=29"); pg.wait_for_timeout(500); snap(pg, rec, "title", t0, w, v)
        pg.get_by_role("button", name="Start mission").click(); pg.wait_for_timeout(300); snap(pg, rec, "brief", t0, w, v)
        pg.get_by_label(VARIANTS[v], exact=False).first.check(); pg.wait_for_timeout(200); snap(pg, rec, "brief-variant", t0, w, v)
        pg.get_by_role("button", name="Open the Design Bay").click(); pg.wait_for_timeout(500); snap(pg, rec, "design-first-sight", t0, w, v)
        pick(pg, ["Imaging camera", "Spectrometer", "Thermal"]); launcher(pg, "Medium launcher")
        pg.get_by_role("button", name="Auto-size fuel").click(); pg.wait_for_timeout(900); snap(pg, rec, "design-built", t0, w, v)
        btn = pg.get_by_role("button", name="Launch", exact=True)
        if btn.is_disabled() or btn.get_attribute("aria-disabled") == "true":
            rec["notes"].append("Launch looked disabled; text: " + pg.locator("[role=status], .launch-check").first.inner_text()[:160] if pg.locator("[role=status], .launch-check").count() else "Launch looked disabled")
        btn.click(); pg.wait_for_timeout(700)
        if pg.locator("button:has-text('Skip launch')").count():
            snap(pg, rec, "launch", t0, w, v); pg.get_by_role("button", name=re.compile("Skip launch")).click()
        else:
            snap(pg, rec, "launch-blocked", t0, w, v); rec["notes"].append("Launch did not start with the starter design: " + pg.locator("main").inner_text()[:200].replace("\n", " ")); return rec, ctx
        wait_after_launch(pg)
        sk = pg.get_by_role("button", name=re.compile("Skip to the storm decision"))
        if sk.count(): sk.click()
        pg.wait_for_selector("button:has-text('Choose')", timeout=15000); pg.wait_for_timeout(300); snap(pg, rec, "storm-decision", t0, w, v)
        pg.get_by_role("button", name=re.compile("Choose: Ride it out")).click()
        pg.get_by_role("button", name=re.compile("Skip to the end")).click(); pg.get_by_role("button", name="See the outcome").click()
        pg.wait_for_selector("button:has-text('Change one decision')"); pg.wait_for_timeout(1400); snap(pg, rec, "outcome", t0, w, v)
        pg.get_by_role("button", name="Change one decision").first.click(); pg.wait_for_timeout(400); snap(pg, rec, "rewind-design", t0, w, v)
        pg.get_by_label("Battery", exact=False).first.fill("300"); pg.get_by_role("button", name="Auto-size fuel").click(); pg.wait_for_timeout(300)
        pg.get_by_role("button", name=re.compile("Run the mission again")).click(); pg.wait_for_timeout(1800); snap(pg, rec, "diff", t0, w, v)
    except Exception as e:
        rec["notes"].append("FLOW STOPPED: " + str(e).splitlines()[0][:200]); 
        try: snap(pg, rec, "stopped", t0, w, v)
        except Exception: pass
    return rec, ctx

if __name__ == "__main__":
    want = sys.argv[1:] or list(VARIANTS)
    out = json.load(open(os.path.join(OUT, "judge-review.json"))) if os.path.exists(os.path.join(OUT, "judge-review.json")) else []
    out = [r for r in out if r["variant"] not in want]
    with sync_playwright() as p:
        b = p.chromium.launch(args=SWIFT)
        for v in want:
            for w in WIDTHS:
                rec, ctx = play(b, v, w); out.append(rec); ctx.close()
                print(f"{v:13s} {w:5d}px  screens={len(rec['screens'])}  notes={rec['notes'][:1]}", flush=True)
        b.close()
    json.dump(out, open(os.path.join(OUT, "judge-review.json"), "w"), indent=1)
