#!/usr/bin/env python3
"""Reading level of the REAL prose a player meets (each <p>/<li> scored on its own; UI fragments are skipped).

    npm run build && npx vite preview --port 4173 &   then   python3 scripts/reading-level.py

Flesch-Kincaid grade is a HEURISTIC (it is rough on short texts and on numbers/units); use it to find paragraphs to
re-read, not as a verdict. Prints every paragraph of 8+ words that scores above GRADE_LIMIT.
"""
import os, re, sys
_here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(_here, "browser-audit.py")).read().split("with sync_playwright() as p:")[0])
GRADE_LIMIT = float(os.environ.get("GRADE_LIMIT", "10"))
TEXTS = """() => [...document.querySelectorAll('main p, main li, .coach p')].filter(e => {
  const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 1 && !e.closest('.tip, footer, .sr-only'); })
  .map(e => { const c = e.cloneNode(true); c.querySelectorAll('.tag, .tags, .term, .sr-only').forEach(x => x.remove()); return c.textContent.replace(/\\s+/g, ' ').trim(); })
  .filter(t => t.split(' ').length >= 8)"""
def syll(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    if not w: return 0
    n = len(re.findall(r"[aeiouy]+", w)) - (1 if w.endswith("e") and not w.endswith("le") else 0)
    return max(1, n)
def grade(t):
    sents = [s for s in re.split(r"(?<=[.!?])\s+", t) if s.strip()]; words = re.findall(r"[A-Za-z']+", t)
    if not words: return 0
    return round(0.39 * len(words) / max(1, len(sents)) + 11.8 * sum(syll(w) for w in words) / len(words) - 15.59, 1)
seen, rows = set(), []
def capture(pg, label):
    for t in pg.evaluate(TEXTS):
        if t in seen: continue
        seen.add(t); rows.append((label, grade(t), len(t.split()), t))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
    ctx, pg = new_page(b)
    pg.goto(f"{BASE}/?seed=29"); pg.wait_for_timeout(300); capture(pg, "title")
    pg.get_by_role("button", name="Start mission").click(); pg.wait_for_timeout(200); capture(pg, "brief")
    pg.get_by_role("button", name="Open the Design Bay").click(); pg.wait_for_timeout(400); capture(pg, "design")
    build(pg, A3, "Medium launcher", 150, 320); capture(pg, "design-built")
    pg.get_by_role("button", name="Launch", exact=True).click(); pg.wait_for_selector("button:has-text('Skip launch')")
    pg.get_by_role("button", name=re.compile("Skip launch")).click(); pg.wait_for_selector("button:has-text('Skip to the storm decision'), button:has-text('Choose')")
    sk = pg.get_by_role("button", name=re.compile("Skip to the storm decision"))
    if sk.count(): sk.click()
    pg.wait_for_selector("button:has-text('Choose')"); capture(pg, "storm")
    pg.get_by_role("button", name=re.compile("Choose: Ride it out")).click()
    pg.get_by_role("button", name=re.compile("Skip to the end")).click(); pg.get_by_role("button", name="See the outcome").click()
    pg.wait_for_selector("button:has-text('Change one decision')"); pg.wait_for_timeout(1600); capture(pg, "outcome")
    for card in pg.get_by_role("button", name=re.compile("Why did this happen")).all()[:1]:
        card.click(); pg.wait_for_timeout(300); capture_text = pg.evaluate("() => document.querySelector('.card-dialog .card-text')?.textContent || ''")
        if capture_text and capture_text not in seen: seen.add(capture_text); rows.append(("science-card", grade(capture_text), len(capture_text.split()), capture_text))
        pg.keyboard.press("Escape")
    pg.get_by_role("button", name="Change one decision").first.click(); pg.wait_for_timeout(300); capture(pg, "rewind")
    b.close()
over = [r for r in rows if r[1] > GRADE_LIMIT]
print(f"{len(rows)} prose paragraphs checked; {len(over)} above grade {GRADE_LIMIT:g} (heuristic)")
for label, g, n, t in sorted(over, key=lambda r: -r[1]): print(f"  [{label}] grade {g} ({n}w): {t[:210]}")
avg = sum(r[1] for r in rows) / max(1, len(rows)); print(f"mean grade {avg:.1f}")
