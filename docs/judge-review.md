# Skeptical-judge review (Phase 6, slice B)

**Method.** A scripted skeptical first-time judge (`scripts/judge-review.py`, real Chromium) played the whole loop (Title, Brief, Design Bay, Launch, Mission Control, Outcome, Rewind, Diff) on all four variants at 1280, 820 and 390 px: 12 runs, 120 screens, screenshots in `review/shots/`. For every screen it records visible words, a reading-time ESTIMATE (words at 200 per minute), console errors, horizontal overflow, clipped text and tap targets under 44 px. `scripts/reading-level.py` scores each real prose paragraph separately. I then looked at the screenshots myself and re-checked every suspicious result by measuring the live page.

**No real stranger was tested.** The owner's stranger-test notes were not provided, so this review is a heuristic, not a substitute for watching a person play. Times below are estimates.

## The first 60 seconds (standard variant, desktop)

| Time | Screen | What a skeptical judge meets |
|---|---|---|
| 0:00-0:10 | Title | A clear promise ("Every choice leaves a trace"), four numbered steps, **Start mission** and **Try the 90-second demo**. 91 words (about 27 s if read in full; a skimmer reads the heading and the buttons). Nothing confusing. |
| 0:10-0:35 | Brief | The only decision is the variant. Constraints and "What makes this hard" explain the Moon, the 46-minute shadow, the data link and the storm window, with NASA DATA / SIMPLIFIED PHYSICS / GAME MODEL labels. 289 words (about 87 s in full) is the longest read in the first minute, and it can be skimmed. |
| 0:35-1:00 | Design Bay | Guided step 1 ("Tick three instrument cards") with the cards outlined. Ticking an instrument draws threads to the meters within a second, which is the moment the idea lands. About 450 words are on screen; the guide keeps attention on one thing. |
| about 1:30-2:30 | First launch | Estimated for a skimmer following the guide; inside the 3-minute target. |

## Findings, ranked

| ID | Severity | Finding | Fixed | Regression test |
|---|---|---|---|---|
| F1 | **Medium** | On a phone (390 px) the sticky meter strip hid every detail line **and the "Unverified placeholder" badge** on the Fuel margin meter. The fuel bar is derived from placeholders P1 to P4, so a derived value was on screen without the badge the project promises everywhere else. | **Yes.** The compact rule now hides every tag except that badge. | `tests/ui/css.test.ts` (rule); `scripts/browser-audit-phase6.py` F1 checks (badge visible at 390 px, other tags still hidden, no overflow, still shown at 1280 px) |
| F2 | Info (false positive) | The review script flagged 24 "clipped text" items: the "Your choice:" and "Effect:" prefixes in cause chains, and the compact meter detail lines at 390 px. All are the deliberate screen-reader-only pattern. | n/a | `browser-audit-phase6.py` F2 (no visible text is cut off inside cause chains) |
| F3 | Low | Reading level. Mean Flesch-Kincaid grade on real prose is **6.3** (62 paragraphs). The ten paragraphs above grade 10 are driven by long instrument names ("Thermal infrared radiometer") and unit-heavy lines, not by hard sentences. The script's whole-screen grades (up to 24.7) are an artifact of gluing UI fragments together and should be ignored. | No | `scripts/reading-level.py` (repeatable) |
| F4 | Low (raised to a requested fix in Phase 7) | The three storm-response cards repeated the same radiation-risk sentence, so the decision took about three screens of scrolling on a phone (panel 1,836 px tall at 390 px wide; the Choose buttons 1,044 px apart). | **Yes, in Phase 7.** One shared risk line; each card's Risks row names the exposed instruments; the three Choose buttons are one sticky row on phones. Every card keeps its cost, risk and power rows and labels. | `tests/ui/response-text.test.ts`, `tests/ui/mission.test.ts`, `tests/ui/css.test.ts`, and the 10 F4 checks in `scripts/browser-audit-phase6.py` (all three buttons on screen at every scroll position at 390x844 and 360x640) |
| F5 | Low | The Standard variant shows "Changes: Nothing changes" with a GAME MODEL label. Harmless but redundant. | No (cosmetic). | n/a |
| F6 | Low | Some jargon appears outside a tooltip on the Design Bay ("eclipse", "safe mode", "Mb", "Wh"). | **Partly, in Phase 7:** the pure-copy part only. The Brief now says "megabits (Mb)" where players first meet it. The rest would need code (tooltip wrappers) and many of the sentences are pinned by tests, so it stays Low. | `scripts/browser-audit-phase6.py` (F6 check) |
| F7 | Info | Stress test: largest text size plus the high-contrast theme at 390 px on every screen: no horizontal overflow, no console error. | n/a | repeatable (see `scripts/browser-audit-phase4.py` for the saved-settings flow) |

**Across all 12 runs and 120 screens:** zero console errors, zero horizontal overflow, zero tap targets under 44 px.

## Dull or confusing moments

- **Dull:** the 10-second launch animation (Skip and Space are offered), the 7-second orbit ticking (Skip to the storm decision), and the long Brief.
- **Confusing:** the meter title "Power in eclipse" and the status "Safe mode" before they are explained; "Best result on this seed" on the outcome.

## False alarms I raised and rejected

These are listed so they are not re-reported.
- "Selecting Tight budget does not change the budget." My probe matched the first "Budget: $...M" on the page, which is the variant's own description ("Budget: $175M, becomes $149M"). The constraints panel does show $149M.
- "On a tablet the meters are missing." A full-page screenshot draws the sticky meter panel where it stuck, not at the top. Measured positions at 820 px show the meters beside the parts from the top of the page.
- "Small tap targets" in my stress test were slider caption labels; the sliders themselves are 44 px.
