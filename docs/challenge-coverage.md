# Challenge coverage: "Space Mission Design Game"

Status: Built / Partly / Not built. This is an honest checklist, not a claim of fit.

**Source limit.** The challenge page and its "Potential Considerations" list were **not supplied** to this project. The five items below are the ones the project owner named. Everything else on the official list is unknown here. [OWNER: paste the remaining "Potential Considerations" items from the challenge page and mark each Built / Partly / Not built. Do not guess.]

| Item (as named by the owner) | Status | What exists today |
|---|---|---|
| Team play | Not built | One player, one browser. No multiplayer, roles or shared sessions. A share link copies a design to another person, which is not team play. |
| Orbit options | Not built | One orbit: a circular lunar orbit at a game-model altitude of 100 km (GAME MODEL). The player does not choose the orbit. |
| Objective definition | Not built | The player does not define the mission objective. The Brief gives a fixed mission with four content-only variants (Standard, Early storm, Tight budget, Data-rich target). They change conditions, not the objective the player sets. |
| Sandbox | Not built | One scripted mission, "Lunar Recon". No free-form mode where the player sets any parameters. |
| Leaderboards | Not built | Best results are saved in the player's own browser only. There is no shared or online ranking and no server. |

## What the project does cover (stated plainly)

- The player designs a spacecraft (launcher, instruments, power, fuel, data storage), flies it, and traces the result to their own choices. See `docs/how-it-works.md`, including the mapping to NASA's launch, space, ground and user segments (our mapping, not NASA's wording).
- NASA data used: three values from the Moon Fact Sheet (radius, GM, mean Earth-Moon distance). That is a small use of NASA data; the physics is simplified and labelled. See `docs/truth-ledger.md`.

## Not claimed

- No Resources-tab tool (GMAT, Mission Viz, Mission Design Lab and others) was used or run for this project unless the owner says so. [OWNER: add any you did use, in field 8 of `docs/submission-form.md` too.]
- No feature here is "planned for the event". The features above are simply not built. A post-event wish list is in `docs/submission.md` ("What's next").
