# Submission text (draft)

> **Placeholders in square brackets are deliberate.** They are things only the event or the team can supply. Nothing here invents the event's rules, criteria or wording. Fill them in from the official pages and remove the brackets.

**Challenge:** Space Mission Design Game (as given by the owner; Intermediate, Beginner/Youth; subject Games). **Event theme name:** not stated in the two official guides (ledger E6). [OWNER: add it if the event page shows one.]

**Team:** Threadline. Members: Sagar (the only member). The AI is not a team member and is not listed as one. [OWNER: roles and links, if you want them shown.]

## 50-word summary

Threadline is a browser game where you design a Moon orbiter, survive a solar storm, then trace every outcome back to the choice that caused it. Coloured threads link decisions to weight, power, cost, fuel, data and science. Rewind with the same seed and see exactly what your decision changed.

## 200-word description

Threadline puts you in charge of a Moon-orbiting mission. You pick three instruments, a launcher, a battery, a solar array, fuel and data storage, and coloured threads show which meters each choice moves. After launch, a solar storm hits on an orbit you cannot predict. You get one in-flight decision, and each answer shows its cost and its risk, with none recommended.

The outcome is a tier, four scores and the top cause chains, each traced from a decision you made, through a resource, to the result. Rewind keeps the seed, so the luck stays identical and only your decision changes; a diff shows the effect. A guided first run teaches the loop in five short steps. Four mission variants, share links and a 90-second demo support replay and judging.

Every number is labelled: NASA DATA for the Moon's size, gravitational parameter and distance, taken from a NASA fact sheet; SIMPLIFIED PHYSICS where a real idea is reduced; GAME MODEL where we invented it. Six Science Cards explain the ideas and show their sources. Threadline is an independent project, not affiliated with NASA, and it is a game model, not a simulator. Nothing needs an account or a server.

## What it does

- Lets a player design a lunar orbiter and see, live, what each choice does to weight, power, cost, fuel, data and science.
- Flies the mission orbit by orbit, with a seeded solar storm and one in-flight decision.
- Explains the outcome as cause chains built from a log of the player's own decisions.
- Rewinds one decision with the same seed and shows a fair before-and-after comparison.
- Teaches with a guided first run, a 90-second demo, and six Science Cards with sources.

## How we built it

- TypeScript, Vite, Phaser (the launch animation only) and zustand. No server and no accounts: it is a static site.
- The simulation is one pure, deterministic function. The Design Bay preview runs the same loop, so the meters never disagree with the flight. Luck comes only from the seed, so Rewind is fair.
- Balance was checked by sweeping thousands of designs for dominant strategies before the interface was built.
- A Truth Ledger records every real-world claim and its source, or marks it unverified. Tests read the installed licences and compare the ledger's NASA values with the game's data file.
- Built with SI assistance (Claude, Anthropic). What was and was not done with SI is in `SI_DISCLOSURE.md`, in the README section "Use of Super Intelligence (SI)", on the Attributions page, and in field 6 of `docs/submission-form.md`. Who had the idea is for the owner to state there; this file does not say.

## What we learned

- If the game keeps a log of causes while it simulates, explaining an outcome is cheap and honest, and Rewind comes almost free.
- A tested ledger catches drift. It caught a corrupted entry (the Moon's gravitational parameter had been overwritten by an unrelated line), and a review of the phone layout caught a badge that marks an unverified value being hidden.
- Running real browsers against deliberate faults (blocked storage, a broken launch file, going offline) showed that the fallbacks work, which is better than assuming it.
- Labelling every number as data, reduced physics or invention changes how a game feels to the people who play it.

## What's next

- Run the audits in Firefox and Safari (not possible in our build environment; manual steps are in `docs/cross-browser.md`).
- Watch real first-time players. No stranger test has been run yet.
- The optional antenna-alignment mini-game (designed, not built).
- Replace the placeholder values (engine efficiency and the burn budgets) with sourced ones, and add more missions.

## Use of NASA data and sources

**NASA-derived data in the game: three values, all from one page.** NASA Space Science Data Coordinated Archive, *Moon Fact Sheet*, `nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html`, read 2026-10-10:

| Value | Used for |
|---|---|
| Volumetric mean radius, 1737.4 km | Orbit size, so the orbit period and the eclipse length |
| Gravitational parameter (GM), 0.00490 x 10^6 km^3/s^2 (three significant figures) | Orbit period |
| Mean Earth-Moon distance (semimajor axis), 0.3844 x 10^6 km | The one-way light delay, shown for information only |

The data file also stores nine other values from the same page (surface gravity, escape velocity, solar irradiance, perigee, apogee and others). The game does not use them.

**Computed by us from those values (SIMPLIFIED PHYSICS, labelled in the game):** the orbit period at 100 km altitude (about 118 minutes), the longest time in the Moon's shadow per orbit (about 46 minutes), and the light delay (about 1.3 seconds). They assume a circular orbit and the Sun in the orbit plane.

**Sources behind the six Science Cards** (each page is listed on its card with the date it was read; the cards contain no numbers):

| Source | Publisher | Read |
|---|---|---|
| Control Algorithms Charge Batteries Faster (NASA Spinoff 2011) | NASA Glenn Research Center | in full |
| State-of-the-Art Small Spacecraft Technology: Power | NASA Small Spacecraft Systems Virtual Institute | search excerpt |
| Earth Calling (NASA educator guide) | NASA | search excerpt |
| How Do Space Weather Effects & Solar Storms Affect Earth? | NASA Goddard Scientific Visualization Studio | search excerpt |
| How does solar variability affect human society, technological systems and the habitability of planets? | NASA Science | search excerpt |
| MAVEN Status Update: Nov. 20, 2014 | LASP, University of Colorado (NASA MAVEN mission) | search excerpt |
| Learn the rocket equation, part 1 | The Planetary Society (not NASA) | search excerpt |
| How 'safe mode' protects space telescopes like Hubble and TESS | Popular Science (not NASA) | search excerpt |
| Survey of NASA's Lessons Learned Process (GAO-01-1015R, 2001) | U.S. Government Accountability Office (not NASA) | search excerpt |

**Game model, not NASA data:** every instrument, launcher, battery, array, fuel, storage and data-link number; the budget; the storm and its damage chance; the scoring thresholds and tier cut-offs; the four variants. The engine efficiency and the three burn budgets are placeholders that are not yet sourced and are marked "Unverified placeholder" wherever they appear.

**Not used:** NASA images, logos, videos, mission names in play, and live NASA data feeds. Threadline is an independent project created for the NASA Space Apps Challenge and is not affiliated with or endorsed by NASA. The full list, with the licences of the two software libraries, is on the in-game Attributions page and in `docs/truth-ledger.md`.

## Judging criteria mapping

The five criteria are from the Judging and Awards Guide (13 Nov 2026, pp. 5-7): Impact, Creativity, Validity, Relevance, Presentation. This is where the evidence for each lives in the project. It is not a self-score.

- **Impact:** what a player can do (design an orbiter, survive a solar storm, see the cause chain) is described above. There is no evidence of effect on real players: no stranger has played it yet (KNOWN_ISSUES.md).
- **Creativity:** the cause-chain log and Rewind with the same seed (see "What it does").
- **Validity:** the Truth Ledger, the labels NASA DATA / SIMPLIFIED PHYSICS / GAME MODEL, and tests that compare the ledger with the data file and the installed licences. The physics is simplified and says so; this is a game model, not a simulator.
- **Relevance:** one NASA page (the Moon Fact Sheet) sets three values the game uses. That is a small use of NASA data; the honest scope is in `docs/challenge-coverage.md` and `docs/how-it-works.md`.
- **Presentation:** the 7-slide demo (`docs/demo/`), the 30-second script, and the five screenshots.
