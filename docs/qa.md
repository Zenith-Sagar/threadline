# Judge Q&A (one page)

Every answer comes from `docs/truth-ledger.md` and the other docs. Lines starting "Owner to add" are things the docs do not record; the team must fill them in. Nothing here is invented.

**Q1. Is this real NASA data?**
Only three values are: the Moon's mean radius, gravitational parameter and mean Earth-Moon distance, from NASA's Moon Fact Sheet (read 2026-10-10), labelled NASA DATA. The orbit period (about 118 minutes), the longest shadow (about 46 minutes) and the light delay (about 1.3 seconds) are our reduced calculations, labelled SIMPLIFIED PHYSICS. Everything else is GAME MODEL, and the storm is a game rule, not a forecast.

**Q2. Why a Moon orbiter?**
The docs record what the mission is, not why it was picked. What the Moon supplies is three NASA values that set the shadow, orbit and light delay the player trades against. It is one mission only; more missions are listed as not built.
*Owner to add: the team's own reason.*

**Q3. How does the cause chain work?**
While the simulation runs it logs each design choice, storm answer and event, and each entry points to the entries that caused it. A chain is read back from that log: a decision, the resource it changed, the event that followed, the outcome. The sentences are computed from the game model, so they describe the game, not real spacecraft.

**Q4. Why is Rewind a fair comparison?**
Luck comes only from the seed: the launch roll, the storm orbit and the radiation dice never depend on your design. Rewind re-runs the same luck with one decision changed, and the diff shows the effect. Tests check determinism and that a storm answer only changes what comes after it.

**Q5. What is untested?**
Everything was run in Chromium only. Firefox and Safari were not run (their browser downloads were blocked here; twelve manual steps are in `docs/cross-browser.md`), phones were tested only by resizing to 390 px, and no real first-time player has tried it. Eight of nine Science Card sources were read only as search excerpts.

**Q6. What did the AI do, and what did the team do?**
The docs record what was checked by running it (tests, browser audits, the ledger) and what is left to humans: event rules, sources, licence, video and team text. They do not record who wrote what, and the event's AI-disclosure wording has not been checked, so the submission holds a placeholder (ledger E7) instead of invented wording.
*Owner to add: the split, in the event's required wording.*

**Q7. Which numbers are placeholders?**
Engine efficiency (300 s) and three burn budgets (80, 900 and 100 m/s) are unsourced placeholders (ledger P1 to P4). They drive the fuel meter, which carries an "Unverified placeholder" badge everywhere, including on phones. Instrument and launcher numbers are GAME MODEL, not real vehicles.

**Q8. Is one strategy always best?**
Not in the game model. A sweep of 2,880 designs found no dominant design, and a larger sweep of 8,640 designs across 12 seeds found each storm answer clearly best in a real share of situations (21.2%, 40.8% and 31.4%; 6.6% had no clear winner). That says nothing about real missions.

**Q9. Does it work offline, and is it accessible?**
An offline copy runs with no internet (`node serve.mjs`); its smoke test blocked every outside request and none was attempted. There is a high-contrast theme, three text sizes, keyboard operation and reduced-motion support, with colour contrast checked by tests. All of that was verified in Chromium only.

**Q10. What comes next?**
Run the audits in Firefox and Safari and watch real first-time players. Replace the placeholder values with sourced ones and add more missions. The antenna-alignment mini-game is designed but not built; audio and live NASA data are not built either.
