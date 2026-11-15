# Tiers, scores and the Phase 3 design decisions

`src/sim/scoring2.ts` is the source of truth. The tier sentences below are checked word for word against
`TIER_DEFINITIONS` by `tests/sim/tiers-docs.test.ts`, so this page cannot drift from the code.

## The five tiers (best first)

| Tier | One sentence |
|---|---|
| Landmark | Every instrument ran on every orbit, the spacecraft stayed healthy, and at least 80% of the data came home. |
| Success | Every instrument ran on every orbit, so all of the science was collected. |
| Recovered | A crisis hit and your response saved the mission: at least 75% of the science, and 15 or more points better than riding it out. |
| Partial | 40% to 99% of the science was collected, with no rescue from your response. |
| Lost with Lessons | The launch failed, or less than 40% of the science was collected. |

Exact thresholds in code: Landmark = 100% science, health of 95 or more, data return of 80% or more.
Recovered = you chose a response other than "Ride it out", the mission ends with at least 75% science, and the
same seed riding the storm out (same design) would have ended at least 15 points lower. Rank order for Rewind
comparisons: Lost with Lessons < Partial < Recovered < Success < Landmark.

## The four scores (each has a plain-language `why` and the log entries that `cause` it)

| Score | Value (0 to 100) |
|---|---|
| Science collected | science points collected / science the instruments could have collected |
| Data returned | Mb that came home / Mb the instruments could have produced |
| Spacecraft health | 100, minus 6 per safe-mode orbit, minus 12 per instrument lost to radiation |
| Budget margin | share of the budget left unspent; 20% left scores 100 |

A single weighted number (45% science, 15% data, 25% health, 15% budget) exists only so the balance sweep can
compare designs. Players never see it.

## Design decisions

**Storage is a design choice; the downlink is a bus constant.** Storage is the buffer between the instruments
and the radio link, so how much to carry is a real trade (0.02 kg and $0.03M per Mb). The downlink (14 Mb per
orbit) is fixed because antenna design belongs to a later comms phase and a fifth slider would crowd the Design
Bay. The default of 120 Mb is carved out of the old structure mass and fixed cost, so a default-storage design
keeps its Phase 2 mass and cost.

**When storage fills,** the instruments pause for that orbit and its science is lost. The log event
`event.storage.full` lists the instruments that were producing data plus the storage choice as its causes.

**The storm** starts on an orbit between 4 and 9, drawn from `deriveSeed(seed, 'storm')`, lasts 3 orbits and
halves the array output. Radiation damage dice come from `(seed, orbit, instrument)` only. Neither depends on the
design or on the response, so Rewind is fair: only what the luck does to you can change.

**The three responses** (no recommendation is built in; each shows its costs and risks):
Ride it out keeps every instrument on and exposed; Switch off the biggest power user gives up that instrument's
science for the storm and cuts the load; Enter safe mode early gives up all science for the storm and protects
the instruments from radiation.

**Light time** is not used by the Phase 3 model. All new numbers are GAME MODEL and add no new real-world claim.
