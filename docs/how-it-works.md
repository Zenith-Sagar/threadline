# How Threadline works (one page)

**The idea.** Every outcome is the end of a chain: a decision you made, a resource it changed, an event that resource allowed or caused, and a result. The game records the chain while it simulates, so it can show it back to you.

```
your decision  ->  resource it changes  ->  event  ->  outcome
Radar sounder  ->  +38 W of load        ->  battery empty in eclipse  ->  safe mode on orbit 8
```

**Six channels, always shown the same way** (icon + line pattern + colour): weight, power, cost, fuel, data, science. Consequence Threads draw from a choice to the meters it moved.

**What runs the mission.** One pure function, `simulate(design, mission, seed, interventions)`. Per orbit it balances power (solar array minus load, battery in eclipse), data (instruments fill storage, a fixed downlink empties it), and the storm (the array weakens; each running instrument risks damage). Nothing in it reads the clock, the screen or `Math.random`: the same inputs always give the same mission. The Design Bay preview calls the same loop (`runOps`), so the meters never disagree with the flight.

**Seeds and Rewind.** Luck comes from the seed: the launch roll, the storm orbit and the radiation dice depend only on the seed, never on your design. So **Change one decision** re-runs the same luck with one thing different, and the diff is fair.

**The log.** Each design choice, storm answer and event is a log entry with the ids of the entries that caused it. Cause chains are built from that log. Scores (science, data return, health, budget margin) each carry a plain-language *why* and the entries behind it.

**Tiers** (full wording in `docs/tiers.md`): Landmark, Success, Recovered, Partial, Lost with Lessons. Recovered means a storm hit, you answered it, and riding it out on the same seed would have ended worse.

**Variants** change content only (storm window, budget, data per instrument). The same code runs them, so Rewind, causes, diff and tiers work unchanged. Each variant has its own balance report (`docs/balance-variants.md`).

**Share links** carry the design, seed, variant and storm answer in the URL hash. A link is untrusted input: it is length-capped, version-checked and validated, numbers are clamped, and the tier shown is recomputed locally, never read from the link.

## Threadline and NASA's four mission segments

The Resources tab lists a NASA page on designing science missions with four segments. The owner named them (launch, space, ground, user); that page was not read, so this mapping is ours, not NASA's wording. All four are simplified.

- Launch: the launcher choice and the seeded launch roll (GAME MODEL).
- Space: the spacecraft, its instruments and its Moon orbit (GAME MODEL; orbit speed and eclipse are SIMPLIFIED PHYSICS using NASA DATA).
- Ground: data storage, the downlink and Mission Control (GAME MODEL; light delay uses NASA DATA, display only).
- User: the science return and the Outcome screen (GAME MODEL).

## Limitations (read these)

- **It is a game model, not a simulator.** Numbers labelled GAME MODEL are invented for play. Numbers labelled SIMPLIFIED PHYSICS use a real idea in a deliberately reduced form (circular orbit, fixed eclipse, no thermal effects, one lumped burn budget). Only values labelled NASA DATA come from a NASA page (the Moon's radius, its gravitational parameter and its mean distance).
- **Placeholders P1 to P4 are unverified:** the engine efficiency and the three burn budgets (transit, orbit insertion, station keeping). They drive the fuel meter, which is badged "Unverified placeholder" everywhere it appears.
- **One mission.** A lunar orbiter. The storm is a game rule, not a forecast of real space weather.
- **Tested in Chromium.** Other browsers and real touch devices are untested.
- **Sources and open items** are in `docs/truth-ledger.md` and on the in-game Attributions page. SI assistance is acknowledged in `SI_DISCLOSURE.md` and on the Attributions page, as the 2026 Submission Guide requires.
