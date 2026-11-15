# Truth Ledger

Every real-world fact, number, or source used in this project.
**VERIFIED** = confirmed against the named source on the stated date.
**UNVERIFIED** = must be checked by a human before it is shown to players as fact.

Last updated: 2026-11-15 (Phase 9)

## Event and rules

| # | Claim | Status | Source | Date |
|---|---|---|---|---|
| E1 | 2026 NASA Space Apps Challenge runs 14-15 November 2026 | VERIFIED (secondary: news and agency partner pages) | https://www.asc-csa.gc.ca/eng/events/2026/2026-11-14-space-apps-challenge.asp ; https://astrobiology.com/2026/09/04/registration-is-now-open-for-the-2026-nasa-space-apps-challenge/ | 2026-10-10 |
| E2 | Full challenge statements due Oct 28; Submission Guide and Judging/Awards Guide due Nov 13 | VERIFIED (the two guides are in hand and both are dated 13 Nov 2026; the earlier secondary source is kept) | NASA Space Apps Challenge, "Judging & Awards Guide" and "Project Submission Guide", both dated 13 Nov 2026 (PDFs supplied by the owner); https://internshala.com/competitions/nasa-international-space-apps-challenge-2026-registration/ | 2026-11-15 |
| E3 | Teams of at most six; Local Event teams need at least one person and Universal Event teams at least two to be eligible for Global Judging; every member registered and on the Members tab | VERIFIED | Judging & Awards Guide (13 Nov 2026), p. 3, "Minimum requirements": "Local Event teams must have at least one (1) person and Universal Event teams must have at least two (2) people to be eligible for global judging. Teams may have no more than six (6) members." | 2026-11-15 |
| E4 | Pre-event coding allowed | UNVERIFIED (the project owner states "allowed"; neither guide says it) | The Participant Terms and Conditions, which were NOT supplied. Look for: any rule on work begun before the event, on pre-existing code, or on originality. The submission form's second checkbox says the project "represents my team's original work" (Judging Guide p. 3), so read the Terms before ticking it | |
| E5 | Judging criteria: Impact, Creativity, Validity, Relevance, Presentation, each scored 1 to 5 | VERIFIED | Judging & Awards Guide (13 Nov 2026), pp. 5-7: "your project will be evaluated on a scale of 1-to-5, in each of the following criteria". Relevance: NASA data as "a core component ... rather than a superficial addition" | 2026-11-15 |
| E6 | Theme name ("The Next Frontier" vs "The Next Explorer") | UNVERIFIED (the two guides do not state a theme name; the earlier sources conflict). The challenge itself, "Space Mission Design Game", was given by the owner and is not checked against the challenge page, which was not supplied | official event site | |
| E7 | AI (SI) usage rules | VERIFIED | Project Submission Guide (13 Nov 2026), p. 9, "Use of Super Intelligence (SI)": SI is permitted; "SI should not be used to (come up with your idea of how to solve the challenge)"; generated content may not use NASA branding; images and videos need a visible watermark; audio, code and data must be acknowledged "in descriptive text and metadata". The SI field is data-collection only, but judges see the indicators in the project | 2026-11-15 |

## NASA data (snapshots)

| # | Value | Status | Source | Date |
|---|---|---|---|---|
| D1 | Moon volumetric mean radius 1737.4 km | VERIFIED | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | 2026-10-10 |
| D2 | Moon GM 0.00490 x 10^6 km^3/s^2 (3 significant figures) | VERIFIED | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | 2026-10-10 |
| D3 | Moon surface gravity 1.62 m/s^2; escape velocity 2.38 km/s | VERIFIED | same | 2026-10-10 |
| D4 | Earth-Moon semimajor axis 0.3844 x 10^6 km; perigee 0.3633; apogee 0.4055 | VERIFIED | same | 2026-10-10 |
| D5 | Solar irradiance 1361.0 W/m^2; revolution 27.3217 d; synodic 29.53 d | VERIFIED | same | 2026-10-10 |

Note: older third-party mirrors of the sheet show different values (for example solar irradiance 1380). Only the official URL is used.

## Values derived by us (pinned by tests/sim/orbit.test.ts)

| # | Derived value | Method | Status |
|---|---|---|---|
| C1 | Circular orbit speed at 100 km altitude about 1.633 km/s | sqrt(GM / r) with D1, D2 | COMPUTED (two-body, SIMPLIFIED PHYSICS) |
| C2 | Orbital period about 117.8 min | 2 pi r / v | COMPUTED |
| C3 | Maximum eclipse fraction about 0.3945 (eclipse about 46.5 min per orbit) | asin(R / (R + h)) / pi | COMPUTED (sun in orbit plane; real orbits vary with sun angle) |
| C4 | One-way light time at mean Earth-Moon distance about 1.282 s | distance / c | COMPUTED |

## Constants

| # | Constant | Status | Note |
|---|---|---|---|
| K1 | g0 = 9.80665 m/s^2 | UNVERIFIED in this session (standard defined value) | Cite an authoritative source on the Delta-v Science Card |
| K2 | c = 299,792.458 km/s | UNVERIFIED in this session (defined value) | Cite on the comms Science Card |

## Placeholders (UNVERIFIED, must be checked by a human)

| # | Placeholder | Where | Notes |
|---|---|---|---|
| P1 | Isp = 300 s | src/content/lunar-recon.ts `dv.ispS` | Replace with a sourced, typical value |
| P2 | Transit correction 80 m/s | `dv.transitMps` | Placeholder |
| P3 | Lunar orbit insertion 900 m/s | `dv.insertionMps` | Placeholder; check a sourced figure |
| P4 | Station-keeping 100 m/s | `dv.stationKeepingMps` | Placeholder |
| P5 | Launcher capacities 270 / 380 / 520 kg, costs $25M / $45M / $80M, reliabilities 0.90 / 0.94 / 0.97 | src/content/vehicles.ts | GAME MODEL; not real vehicles. Costs retuned in Phase 2 (were 35 / 55 / 85) |
| P6 | All instrument masses, powers, costs, science values | src/content/instruments.ts | GAME MODEL; not real specs. Costs retuned in Phase 2 (imager 18, spectro 24, altimeter 26, thermal 13, magneto 8, radar 50) |
| P7 | Bus mass and cost coefficients, budget $175M, fixed bus cost $20M | src/content/lunar-recon.ts | GAME MODEL. Retuned in Phase 2 (budget was 170, fixed cost 40) |

## Not yet checked

| Item | Status |
|---|---|
| api.nasa.gov DONKI paths, CORS, update rate | UNVERIFIED (secondary: DEMO_KEY limits 30/hour and 50/day) |
| JPL Horizons API CORS | UNVERIFIED (docs: https://ssd-api.jpl.nasa.gov/doc/horizons.html, v1.3 June 2025) |
| PDS, GIBS, Moon Trek availability and terms | UNVERIFIED |
| Font licenses (Space Grotesk, Inter, JetBrains Mono) | RESOLVED in Phase 6: no font is bundled or loaded, so nothing needs a licence (tests/docs/licenses.test.ts scans for it) |
| NASA media guidelines: logos need permission; credit NASA as source | VERIFIED (secondary mirror of https://www.nasa.gov/multimedia/guidelines/index.html) |

## Tooling

| Item | Status |
|---|---|
| Phaser 3.90.0 pinned; Phaser 4 exists (v4.0.0 on 2026-04-10, v4.1.0 on 2026-04-30) | VERIFIED (https://phaser.io/download/phaser4), decision: stay on 3 |
| Dependency versions | See package.json (exact pins) and package-lock.json |

## Phase 2 additions (2026-10-12)

### Verified by running something

| # | Claim | How it was checked |
|---|---|---|
| S1 | Balance sweep: 2,880 designs (20 triples x 3 launchers x 4 batteries x 4 arrays x 3 fuel margins); 1,738 valid (60.3%); 1,040 Success (36.1%); Pareto front of 55 designs; no single dominant design | `SWEEP=1 npm run sweep` re-run on 2026-10-12; pinned by tests/sim/balance.test.ts; table in docs/balance-sweep.md |
| S2 | Preview and simulate() agree on brownout orbits and science % for 300+ launchable designs | tests/sim/preview.test.ts |
| S3 | (Phase 2 result, superseded by S6) 58 of 58 real-browser checks pass (Chromium via Playwright): flow, validation, threads, launch timing and skip, keyboard, focus ring, 44 px targets, no horizontal scroll at 1280 / 820 / 390 px, no console errors | `scripts/browser-audit.py`, 2026-10-12. Chromium only: Firefox, Safari and real touch devices are NOT tested |
| S4 | Colour contrast (WCAG 2.x): text worst case 5.19:1 (danger on raised) and at least 6.88:1 for muted text; fills 6.88:1 to 11.34:1; borders at least 3.97:1; focus ring at least 8.55:1; every thread colour at least 6.46:1 | tests/ui/contrast.test.ts (45 checks), values recomputed independently |

### Honest-labelling rules in the UI

| # | Rule | Where |
|---|---|---|
| L1 | Every number group carries NASA DATA, SIMPLIFIED PHYSICS or GAME MODEL | meters, cards, chains, diff, brief |
| L2 | "Unverified placeholder" badge on anything derived from P1-P4 (Isp and the three burn budgets) | fuel meter, Auto-size fuel row, Engineering Detail rows for delta-v and Isp, diff "Fuel margin" row |
| L3 | Cause-chain sentences are computed from the model, so they are GAME MODEL / SIMPLIFIED PHYSICS statements, not facts about real spacecraft | src/sim/causes.ts |

### Qualitative real-world statements in player-facing text (UNVERIFIED, general knowledge only)

| # | Text | Status |
|---|---|---|
| Q1 | Launch caption: "Passing through the thickest air, where the rocket is under the most stress" (max-Q) | RESOLVED in Phase 4 (see R1-R6 below) |
| Q2 | Launch caption: "Flight controllers end the flight safely, away from people" (range safety) | RESOLVED in Phase 4 (see R1-R6 below) |
| Q3 | Glossary "usable battery": batteries last longer if never drained completely | RESOLVED in Phase 4 (see R1-R6 below) |
| Q4 | Failure card: "Real launch teams investigate failures to find out what went wrong" | RESOLVED in Phase 4 (see R1-R6 below) |

### Code provenance notes

| # | Note |
|---|---|
| N1 | Phase 3 Step 0: `src/sim/preview.ts` no longer holds its own copy of the orbit loop. It validates, builds metrics and calls `runOps()` in `src/sim/models/ops.ts`, the same function `simulate()` calls. The old "reconstructed after an accidental overwrite" note is removed because it is no longer true. Parity is pinned by tests/sim/preview.test.ts, including storm, responses, damage and storage. |
| N2 | The Phase 1 "byte-identical" claim no longer holds. Phase 3 modified `simulate.ts` (shared loop, interventions, events), `preview.ts`, `mass.ts`, `metrics.ts`, `validate.ts`, `causes.ts`, `diff.ts`, `types.ts` (additive fields, one widened union), `guards.ts`, `constants.ts` and `content/lunar-recon.ts`. `LUNAR_RECON_CALM` (the mission without the storm) keeps the Phase 1 and 2 regression pins. |

### New dev dependencies

| Package | Version | Why |
|---|---|---|
| @types/node | 26.6.5 | node types for tests that read files |
| happy-dom | 20.14.6 | DOM environment for the UI flow tests |

## Phase 3 additions (2026-10-16)

### Verified by running something

| # | Claim | How it was checked |
|---|---|---|
| S5 | Extended sweep: 8,640 designs (20 triples x 3 launchers x 4 batteries x 4 arrays x 3 fuel margins x 3 storage sizes) x 12 seeds; 5,094 valid (59.0%); 3,742 viable (43.3%); Pareto front of 76; three distinct archetypes; no dominant design. Each storm response is clearly best (composite ahead by 0.5 or more) in a meaningful share of 7,248 situations: ride it out 21.2%, switch off the biggest power user 40.8%, safe mode early 31.4%, no clear winner 6.6% | `SWEEP=1 npm run sweep` re-run 2026-10-16; pinned by tests/sim/balance.test.ts; table in docs/balance-sweep.md |
| S6 | 84 of 84 real-browser checks pass (Chromium via Playwright), including Mission Control: 0.5 s orbit ticks, storm warning at orbit 7 after about 3 s, exactly three responses, none recommended, Pause/Resume, whole phase 9.1 s (4.4 s with reduced motion), all five tiers through the real UI, and a response-only rewind (Partial becomes Recovered). Chromium only: Firefox, Safari and real touch devices are NOT tested | `scripts/browser-audit.py`, 2026-10-16 |
| S7 | 217 unit and DOM tests pass, including the storm-timing, intervention-downstream-only, determinism, fuzz and tier-definition tests | `npm run check` |

### New GAME MODEL parameters (no new real-world claim; labelled GAME MODEL in the UI)

| # | Parameter | Where |
|---|---|---|
| G1 | Storm: starts on an orbit 4 to 9 drawn from `deriveSeed(seed, 'storm')`; lasts 3 orbits; array makes 50% of its power; 15% chance per running instrument per storm orbit of permanent radiation damage (dice from seed, orbit and instrument only). "Not a forecast of real space weather." | src/content/lunar-recon.ts `storm` |
| G2 | Data: downlink 14 Mb per orbit (bus constant); storage is a design choice, default 120 Mb, 0.02 kg and $0.03M per Mb. The default is carved out of the old structure mass (117.6 kg) and fixed cost ($16.4M), so default-storage designs keep their Phase 2 mass and cost | `bus.*` in lunar-recon.ts; docs/tiers.md |
| G3 | Scoring v2: health = 100 minus 6 per safe-mode orbit minus 12 per instrument lost to radiation; budget margin 20% left scores 100; Landmark needs 100% science, health of 95 or more and 80% of data returned; Recovered needs a non-default response, at least 75% science and 15 or more points better than riding it out | src/sim/scoring2.ts; docs/tiers.md (checked word for word by tests/sim/tiers-docs.test.ts) |
| G4 | Light delay (about 1.3 s one way) is shown for display only; it uses the NASA DATA Earth-Moon mean distance and the defined constant c (K2, still UNVERIFIED in this session) | src/ui/meter-model.ts |

### Qualitative statements added in Phase 3 (UNVERIFIED, general knowledge only)

| # | Text | Status |
|---|---|---|
| Q5 | Storm warning: "Instruments that stay on can be damaged by radiation" | RESOLVED in Phase 4 (see R1-R6 below) |
| Q6 | "Safe mode" glossary: the spacecraft switches off instruments to survive | RESOLVED in Phase 4 (see R1-R6 below) |

## Phase 4 additions (2026-10-18)

### Q1-Q6 resolved (cite or soften)

| # | Was | Now |
|---|---|---|
| R1 (Q1) | Launch caption about the thickest air and most stress (max-Q) | Softened to "Climbing fast through the atmosphere." The only sources found for max-Q were not NASA pages, so the claim was removed rather than cited. |
| R2 (Q2) | "Flight controllers end the flight safely, away from people" | Softened to "The flight cannot continue." No range-safety claim any more. |
| R3 (Q3) | Glossary: batteries last longer if never drained completely | Rewritten as a game rule: "In this game only part of the battery can be used... This is a game rule." |
| R4 (Q4) | "Real launch teams investigate failures..." | Now "NASA keeps a Lessons Learned Information System so that past failures are not relearned", backed by the GAO review on the "Why failures are studied" card. The review is from 2001. |
| R5 (Q5) | "Instruments that stay on can be damaged by radiation" | Backed by NASA Goddard and NASA Science pages on the "Solar storms and radiation" card. |
| R6 (Q6) | Safe mode glossary description | Game wording ("In this game...") plus a real example (MAVEN safe state) on the "Eclipse, batteries and safe mode" card. |

### Science Card sources (all read 2026-10-16; no real-world number appears in any card, a test rejects digits)

"Read in full" means the whole page was fetched. "Excerpt" means only the search-result text of the page was read, so a human should open the page once before submission.

| Card | Source | How read | What the card uses |
|---|---|---|---|
| Why fuel and weight matter | The Planetary Society, "Learn the rocket equation, part 1" (planetary.org) | Excerpt (not a NASA page) | A rocket must also accelerate the propellant it has not yet used; the rocket equation relates speed change to masses |
| Why fuel and weight matter; Eclipse; Solar panels | NASA Spinoff 2011, "Control Algorithms Charge Batteries Faster" (ntrs.nasa.gov, 20120001911) | Read in full | Weight and size are big drivers; "if you have solar arrays and you are in orbit, at some point you're going to be in eclipse"; arrays power the craft and charge the battery, the battery takes over in shadow; panel output varies with light and conditions |
| Eclipse, batteries and safe mode | LASP, "MAVEN Status Update: Nov. 20, 2014" (a NASA mission) | Excerpt | The spacecraft enters a protective state on its own when it detects a problem, with instruments off |
| Solar panels | NASA, "State-of-the-Art Small Spacecraft Technology: Power" (nasa.gov, 2022 edition) | Excerpt | Small spacecraft commonly use solar cells, panels and arrays, with batteries for storage |
| Sending data home | NASA, "Earth Calling" educator guide (nasa.gov) | Excerpt | Radio signals travel at the speed of light; a signal to the Moon takes a little over a second |
| Solar storms and radiation | NASA Goddard SVS 31248; NASA Science (heliophysics: how solar variability affects technological systems); Popular Science on safe mode | Excerpts | Energetic particles can cause temporary glitches, damage electronics and degrade solar arrays; operators may deliberately use safe mode during a storm |
| Why failures are studied | U.S. GAO, GAO-01-1015R, on NASA's Lessons Learned Information System (gao.gov) | Excerpt | The system exists to avoid relearning past lessons; the review also found lessons were not always collected or shared well |

K2 (the speed of light constant used for the display-only light delay) stays UNVERIFIED: I did not confirm the exact figure on a NASA page, so no card states it.

Card statements that are NOT sourced are listed in the "Unverified" footer of the card itself (burn budgets and engine efficiency, storm halving the array, link rate and storage costs, damage chance and storm length, and the age of the GAO review).

### Verified by running something

| # | Claim | How it was checked |
|---|---|---|
| S8 | 315 unit and DOM tests pass (30 files), including the tutorial state machine, the demo-seed guard, the storage-blocked fallback, the cards, the announcements and both contrast themes | `npm run check` |
| S9 | Phase 4 browser audit passes 49 of 49 in Chromium: guided run, Demo Mode, save, Science Cards, display settings, 390 px full loop, keyboard-only full loop, reduced motion, feel timings. The earlier audit still passes 84 of 84 | `scripts/browser-audit-phase4.py` and `scripts/browser-audit.py`, 2026-10-18. Chromium only |
| S10 | First load is 40.6 KB gzipped (36.0 KB script plus 4.2 KB style); Phaser (321 KB gzipped) loads only for the launch | production build and the audit |
| S11 | High-contrast theme: text at least 8.62:1 (danger on the lightest surface; white text 18.7:1 or more, muted 14.5:1 or more), dark text on fills 9.66:1 or more, borders at least 11.2:1, focus ring at least 11.2:1, every thread colour at least 9.67:1 | tests/ui/contrast-theme.test.ts, values recomputed independently |

### Process notes

| # | Note |
|---|---|
| N3 | Phase 4 was written by two writers working in the same folder at the same time (core modules, cards data and tests by one; screens, shell, persistence and the audit script by the other). Three of my files (`cards.ts`, `coach.ts`, `prefs.ts`) overwrote the other writer's versions and `app.ts` and `tooltip.ts` ended up with duplicate imports. I merged them into one consistent design and re-verified everything by running it. Read `src/ui/app.ts`, `src/ui/coach.ts` and `src/ui/tooltip.ts` once by eye. |
| N4 | Sound: not built. A small optional toggle would fit the size limit, but it was cut for budget. Nothing in the game relies on sound. |

## Phase 5 additions

### Slice A: deploy

| # | Claim | Status |
|---|---|---|
| DP1 | GitHub Pages serves a custom `404.html` placed at the root of the published files | VERIFIED in Phase 6 against GitHub Docs, "Creating a custom 404 page for your GitHub Pages site" (docs.github.com, read via search excerpt): the file is named `404.html` and sits in the publishing source. The postbuild step writes exactly that file. The separate claim that a project site is served under `/<repo>/` was not in what I read and stays UNVERIFIED (the base path is a build option, so a different path only needs a different option). |
| DP2 | Pages workflow actions: `configure-pages@v5`, `upload-pages-artifact@v4`, `deploy-pages@v4` | VERIFIED against the current GitHub Docs page "Using custom workflows with GitHub Pages" (docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), read in this session. Older Enterprise Server versions of the same page show older action versions, so versions differ by GitHub product. This corrects an earlier ledger line that said `upload-pages-artifact@v3`. |
| DP6 | `actions/checkout@v4`, `actions/setup-node@v4`, Node 22 in `ci.yml` | UNVERIFIED (not covered by that page; written from memory). Check each action's page and pin before relying on the deploy. The workflow file says so. |
| DP3 | The production build passes a deployed-build smoke check under `/threadline/`: the page loads, the lazy Phaser chunk loads from under the base path, no failed request, no console error, no source maps, `404.html` is the app, `.nojekyll` exists | VERIFIED by running `scripts/browser-audit-phase5.py` in Chromium against `vite preview --base=/threadline/`. First load is 43.9 KB gzipped (page plus script 39.2 KB plus style 4.3 KB), under the 60 KB limit. Phaser (about 321 KB gzipped) loads only for the launch. |
| DP4 | Phaser 3.90.0 and zustand 5.0.15 are MIT-licensed | VERIFIED in Phase 6 by reading the INSTALLED packages: `license` field is "MIT" in both `package.json` files, and the LICENSE files are the MIT licence (Phaser: Copyright (c) 2024 Richard Davey, Phaser Studio Inc.; zustand: Copyright (c) 2019 Paul Henschel). The attributions page now carries both notices in full. `tests/docs/licenses.test.ts` re-reads the installed licences on every run, so an upgrade or a new dependency fails the test until the page is updated. |
| DP5 | Fonts | VERIFIED in Phase 6 by running a scan: no font file in `public/` or `src/`, no `@font-face`, no font host in the HTML or CSS. The game uses the system UI font, so nothing needs a licence (tests/docs/licenses.test.ts). |
| DP7 | AI-usage disclosure wording | Still UNVERIFIED. `attributions.html` has a visible placeholder and no invented wording; a test fails if wording claiming AI authorship appears there. |

### Slice B: mission variants (content only)

| # | Claim | How it was checked |
|---|---|---|
| V1 | Three modifiers on the Brief screen, each with one sentence and the one number that changes: Early storm (storm window 4-9 becomes 2-4), Tight budget ($175M becomes $149M, minus 15%), Data-rich target (data per instrument plus 30%). All GAME MODEL; they only change mission constants, so the same `simulate()`, Rewind, causes, diff and tiers run on them | tests/sim/variants.test.ts; real-browser audit (the $149M refusal, the early storm on Mission Control) |
| V2 | Sweeps, 8,640 designs each. Early storm: 5,094 valid, 3,739 viable, Pareto 89; responses clearly best in 13.4% (ride out), 25.3% (switch off), 56.3% (safe mode early) of 3,624 situations. Tight budget: 2,761 valid (32.0%), 2,116 viable, Pareto 58; 24.6% / 40.2% / 29.2% of 4,164. Data-rich: 5,094 valid, 3,703 viable, Pareto 84; 19.7% / 40.2% / 32.1% of 7,248. Every variant has three distinct viable archetypes and no dominant design. No retune was needed | `SWEEP=1 npx vitest run tests/sim/variants-balance.test.ts` re-run in this session; the saved report (docs/balance-variants.md) matches the fresh run exactly |
| V3 | Best tier is stored per (seed, variant) (key such as `42:early-storm`); the demo stays on the standard variant and still ends Recovered | audit; tests/core/demo.test.ts |

### Slice C: share links

| # | Claim | How it was checked |
|---|---|---|
| SH1 | A link carries version, seed, variant, design and the storm answer in the URL hash. It is treated as untrusted: length cap 600, version check, repeated fields rejected, unknown variant, instrument or launcher rejected, numbers clamped with a visible note, unknown storm answer dropped. A tier in a link is never trusted: the receiver recomputes it | tests/share/code.test.ts (round trip for every variant and answer, 3,000 randomly tampered links never throw) |
| SH2 | Copy link and Copy summary on the outcome; if the browser refuses to copy, the text is shown selected in a box; copying needs no storage | tests/ui/share.test.ts (6 tests including blocked storage) and the real-Chromium audit (real clipboard, link opened in a brand-new browser context, tampered, oversize, wrong-version, script-looking and out-of-range links, refused clipboard) |

### Slice D: antenna-alignment mini-game

NOT BUILT. It was optional and was skipped for budget. Nothing in the game depends on it, no ledger claim refers to it, and the README says so.

### Slice E: judge-ready docs

| # | Claim | How it was checked |
|---|---|---|
| J1 | `docs/demo-script.md` matches Demo Mode: seed 29, storm warning on orbit 5, answer "Switch off the Spectrometer", outcome Recovered with science 79%, data 78%, health 88%, budget margin 100%; Rewind with Battery 300 Wh gives Recovered to Recovered and budget margin 100% to 94%. These numbers are GAME MODEL results of this version | walked by hand in real Chromium on the production build; tests/docs/judge-docs.test.ts checks that every quoted button label exists in the source and that the timings fit |
| J2 | The video script fits 2:00; `docs/how-it-works.md` is under one page and states the limitations (game model, simplified physics, P1-P4 unverified) | tests/docs/judge-docs.test.ts |

### Verification summary

| # | Claim | How it was checked |
|---|---|---|
| S12 | 402 unit and DOM tests pass (41 files) | `npm run check` |
| S13 | Real-Chromium audits all pass: Phase 5 audit 41 of 41 (under the base path), Phase 4 audit 49 of 49, Phase 1-3 audit 84 of 84. Chromium only | the three audit scripts, run in this session |

### Process notes

| # | Note |
|---|---|
| N5 | When this phase started, slices A, B and C (deploy files, variants, share code and screens, the attributions page, 20 new files) were already in the folder and I did not write them. I read them, ran them, and then added what was missing: the DOM tests for the share panel and banner, a storage-blocked test, the share round trip in the browser audit, and slice E. Slice D was not built. I corrected the stale action-version line (D2). |

## Phase 6 additions (freeze, harden, package)

### Slice A: truth cleanup

| # | Item | Result |
|---|---|---|
| T1 | Licences of the two shipped libraries | RESOLVED: both MIT (see DP4). Guarded by a test that reads the installed packages. |
| T2 | Font licences | RESOLVED: no fonts are bundled (DP5). The old "Space Grotesk, Inter, JetBrains Mono UNVERIFIED" line was obsolete and is marked resolved. |
| T3 | GitHub Pages custom 404 | RESOLVED for the `404.html` mechanism (DP1). |
| T4 | **Ledger corruption found and fixed.** In Phase 5 the NASA-data row D2 (the Moon's GM, which the orbit period is computed from) had been overwritten by a GitHub Actions row, and the same ids D1-D6 were reused for the deploy items. D2 is restored and the deploy items are now DP1-DP6. `tests/docs/ledger.test.ts` now checks that rows D1-D5 exist and that their numbers equal `src/data/snapshots/moon-facts.json`, and that no table repeats an id. | FIXED |

### Still UNVERIFIED (also summarised in the README, "Honest limitations")

**A human must check these (running code cannot resolve them):**

| Group | Items |
|---|---|
| Event rules | E3 team size; E4 pre-event coding allowed (the project owner says yes); E5 judging dimensions; E6 theme name (sources conflict); E7 AI-usage disclosure wording (a placeholder is shown, none is invented) |
| Placeholders | P1 engine efficiency; P2 transit burn; P3 orbit-insertion burn; P4 station-keeping burn. They drive the fuel meter, which is badged everywhere it appears |
| Constants | K1 g0; K2 the speed of light. Both are defined constants, but neither is cited on a NASA page |
| Sources | The GAO review (2001) may not describe NASA's current process. Eight of the nine Science Card source pages were read only as search excerpts; only the NASA Spinoff 2011 page was fetched in full. Open each page once before submission |
| Deploy | DP6 `checkout@v4`, `setup-node@v4` and Node 22 in the workflow; the `/<repo>/` project-site path in DP1 |

**Accepted as game model (deliberately not real):** every number labelled GAME MODEL (instrument, launcher and bus values, the budget, the storm and its damage chance, the data link and storage, the scoring thresholds and tier cut-offs, the variant numbers); the simplifications labelled SIMPLIFIED PHYSICS (circular orbit, fixed eclipse, no thermal effects, one lumped burn budget); a single lunar mission. NASA live-data sources (DONKI, Horizons, PDS, GIBS, Moon Trek) are not used by the game, so their open questions are moot.

### Slice B: skeptical-judge review (details in docs/judge-review.md)

| # | Claim | How it was checked |
|---|---|---|
| R7 | 12 scripted playthroughs (4 variants x 1280/820/390 px, 120 screens): zero console errors, zero horizontal overflow, zero tap targets under 44 px. A stress run at the largest text size plus the high-contrast theme at 390 px on every screen: no overflow, no error | `scripts/judge-review.py` re-run in this session, plus a separate measurement script |
| R8 | One Medium finding fixed (F1): on phones the Unverified placeholder badge on the Fuel margin meter was visually hidden. It is visible again, with regression tests | `tests/ui/css.test.ts`, `scripts/browser-audit-phase6.py` (5 of 5) |
| R9 | Mean reading grade on real prose is 6.3 (heuristic, Flesch-Kincaid per paragraph, 62 paragraphs) | `scripts/reading-level.py`. No stranger was tested; times in the review are estimates |

### Slice C: cross-browser and robustness

| # | Claim | How it was checked |
|---|---|---|
| X1 | **Firefox and WebKit/Safari were NOT run.** `playwright install firefox` failed (the browser download host is blocked in the build environment) and neither browser launches (no executable). Cross-browser support is UNVERIFIED; twelve manual steps are in `docs/cross-browser.md` | attempted in this session |
| X2 | Faults injected on purpose in Chromium all pass: storage blocked, clipboard missing, the launch animation file throwing on load, answering 404, and throwing on start (text launch takes over each time), a slow download (Skip works at once; a late file does not pull the player back), a patient player (animation plays when it arrives), offline after load (whole loop and sharing work), and a resize during the launch at four widths. No application bug was found | `scripts/browser-audit-phase6.py`: 31 of 31 checks (5 review-fix checks plus 26 robustness checks) |

### Slice D: release package

| # | Claim | How it was checked |
|---|---|---|
| Y1 | `npm run audit:all` passes every stage, exit code 0, in about 4.5 minutes: 446 of 446 unit and DOM tests (with typecheck and lint), browser audits of 84, 49, 31 and 41 checks, and an 11-check offline smoke audit | run in this session, one command |
| Y2 | The offline package (`release/threadline-offline.zip`, 371,165 bytes) runs with no internet: unzipped into a fresh folder with no `node_modules`, served by `scripts/serve.mjs`, with every request outside the local server blocked and counted: zero attempted, zero local failures, no console error, the launch animation file loads and draws, the demo reaches Recovered, both licences are shown, an unknown address answers 404, path-traversal requests are refused. Python's built-in server was also checked by hand in an earlier run | `scripts/browser-audit-offline.py`; `tests/build/release-tools.test.ts` (path safety) |
| Y3 | First load is about 45 KB gzipped (script 40.52 KB plus style 4.52 KB), under the 60 KB limit; the launch animation file (320.96 KB gzipped) loads only when a player launches | `npm run build`, this session |
| Y4 | The five submission screenshots are 1280x720 and repeatable: across two runs four are pixel-identical and the threads image differs by a few pixels between runs (2 to 39 of 921,600, animation timing) | `scripts/screenshots.py`, compared pixel by pixel |
| Y5 | A built copy of the game inside `release/` once made the linter report 4,407 false errors; generated folders are now ignored by lint and git, and a test checks it | `tests/build/release-tools.test.ts` |
| Y6 | CHANGELOG is tag-ready (newest entry equals the version in `package.json`, date left as `YYYY-MM-DD` on purpose); KNOWN_ISSUES lists what is untested, what is unbuilt and what a human must check; neither claims Firefox or Safari work | `tests/docs/release.test.ts`, `tests/docs/release-docs.test.ts` |

### Slice E: submission text

| # | Claim | How it was checked |
|---|---|---|
| Z1 | `docs/submission.md` has a 50-word summary and a 199-word description, the required sections, and four clearly marked placeholders (theme or challenge name, judging criteria mapping, AI-usage disclosure wording, team members). None of those is invented, and a test fails if any of the five criteria names from the brief appears there | `tests/docs/submission.test.ts` |
| Z2 | The "Use of NASA data" section is exact: three NASA values (mean radius, GM, mean Earth-Moon distance) from one page, used for the orbit period, eclipse length and the display-only light delay; nine other stored values are unused; nine source pages are listed with the publisher each card shows and which are not NASA | the same test compares the section with `src/data/snapshots/moon-facts.json` and with the card sources |

### Dependencies (corrected in Phase 7)

| # | Claim | How it was checked |
|---|---|---|
| H1 | **Shipped dependencies: 0 known vulnerabilities** (`phaser`, `zustand`). **The development toolchain is NOT clean:** `npm audit` reports 11 moderate advisories (0 high, 0 critical), all in the lint chain (eslint, `@eslint/js`, typescript-eslint, and `minimatch` beneath them; advisory GHSA-g3hv-75wg-m249, a denial of service in glob matching). They are not shipped to players. Every fix npm offers is a breaking downgrade (for example eslint 4), so none was applied on a frozen release. An earlier ledger line said "0 in total"; that was wrong and is corrected here. A separate high advisory in `happy-dom` (test-only) was fixed earlier by upgrading it from 20.14.6 to 21.0.4 | `npm audit --omit=dev` (0) and `npm audit` (11 moderate) run in Phase 7; `package-lock.json` shows happy-dom 21.0.4 |
| H2 | Package version is 1.0.0 and `CHANGELOG.md` is tag-ready (its date is left as YYYY-MM-DD on purpose) | `tests/docs/release-docs.test.ts` |

### Process notes (Phase 6)

| # | Note |
|---|---|
| N6 | The sandbox was reset after the A+B checkpoint, deleting the project. I restored it from `threadline-phase6-checkpoint-AB.zip` and rebuilt slices C, D and E from this conversation. The checkpoint rule is why only that work, and not slices A and B, had to be redone. |
| N7 | After the reset another writer was again active in the folder: it had added `tests/docs/release.test.ts` and `tests/docs/release-docs.test.ts`, whose requirements for CHANGELOG and KNOWN_ISSUES differ slightly. My first versions of those two documents failed them. I changed my documents to satisfy both tests and removed my own overlapping test, so there is one source of truth. Read `CHANGELOG.md`, `KNOWN_ISSUES.md` and the two release tests once. |
| N8 | The Phase 6 browser audit has 31 checks. A figure of 54 printed earlier in this phase came from a file that was lost in the reset and could not be reproduced, so it is not used anywhere. |
| N9 | The folder was written by more than one writer during Phase 6, which left duplicated material. In Phase 7 the README's four overlapping release sections were merged into one ("Release and verification") and this ledger's two sets of Slice C, D, E and process sections were merged into one. No claim was dropped; where two versions disagreed (test counts, screenshot pixel differences) the figures are shown as ranges or tied to the run that produced them |

## Phase 7 additions (evidence-driven fixes and final release)

### What was and was not supplied

| # | Item |
|---|---|
| W1 | The four input blocks (A stranger-test notes, B Firefox/Safari/phone notes, C live-link notes, D official event text) were all empty. **Skipped:** the evidence-driven parts of Slices 1, 2 and 3 (there was nothing to reproduce) and all of Slice 5 (event-day completion). Consequences, all still true: event rules E3 to E7 stay UNVERIFIED; the AI-usage disclosure stays a placeholder; no deployed link was checked; Firefox and Safari still have not been run; no real player has tried the game. Nothing was invented to fill the gap |
| W2 | The two items the owner named explicitly (F4, and F6 if pure copy) were done anyway, because they do not depend on evidence |

### Slice 1: F4 and F6

| # | Claim | How it was checked |
|---|---|---|
| W3 | **F4 fixed.** At 390 px wide the storm decision was 1,836 px tall with its three Choose buttons spread over 1,044 px (the last about two screens down). A first attempt that only shortened the wording gave 1,685 px and 855 px, which was not enough. The fix that worked: the radiation chance is stated once for all three cards; each card keeps its own Costs, Risks (now naming the instruments left exposed), Power row and model labels; and the three Choose buttons moved into one row, sticky at the bottom of a phone screen while the decision is showing, under their own cards on wide screens. Result: the panel is 1,609 px, and **all three Choose buttons are fully on screen at every scroll position through the decision** at 390x844 and at 360x640. Cost and risk of each response are all still shown. On wide screens the layout is about the same height (1280x720: 690 px before, 678 px after) | measured in real Chromium with a script before and after; `scripts/browser-audit-phase6.py` (10 F4 checks); tests below |
| W4 | Pinned tests were changed deliberately, not loosened: `tests/ui/mission.test.ts` (a card no longer holds a button; the 15% sentence appears once; each card names its exposed instruments; the Choose row is one group and each button points at its own card with `aria-describedby`), `tests/ui/css.test.ts` (the old per-card button row rule is gone; the row is sticky on narrow screens only; 44 px targets), and new cases in `tests/ui/response-text.test.ts`. The audit wording check ("each card shows Costs, Risks, Power and a model label") is unchanged and still passes | `npm run check` |
| W5 | **F6, pure copy only:** the Brief now says "14 megabits (Mb)" where players first meet "Mb". The other jargon items are not a pure copy change (several strings are pinned by tests and the rest need code to add tooltips), so they stay logged as Low in KNOWN_ISSUES | `browser-audit-phase6.py` F6 check |

### Slice 4: video kit (no product code)

| # | Claim | How it was checked |
|---|---|---|
| W6 | `docs/video/captions.srt` (24 cues), `shot-list.md` (eight shots matching the Demo clicks) and `recording-checklist.md` (resolution, zoom, seed, demo flag, what not to claim) exist. **Verified independently:** the SRT has sequential indexes, no overlaps, at most two lines of 42 characters, ends at 119.8 s (budget 120 s), fastest cue 2.67 words per second. **Corrected:** the shot list said `npm run screenshots` replays "shots 1 to 8 and 10"; it writes five images covering shots 1, 3, 5, 6 and 7, and the sentence now says so, with a test | my own SRT parser; `tests/docs/video-kit.test.ts` |

### Slice 6: release gate

| # | Claim | How it was checked |
|---|---|---|
| W7 | `npm run audit:all` passes all 9 stages (exit 0, 204 s): 468 of 468 unit and DOM tests with typecheck and lint; browser audits of 84, 49, 42 and 41 checks; the offline package builds and its 11-check smoke audit passes from a fresh unzip with every outside request blocked | run in this session, one command |
| W8 | First load is about 44.3 KB gzipped (page 0.3 KB, script 39.4 KB, style 4.6 KB; gzip level 9, 1 KB = 1,024 bytes), under the 60 KB limit. Vite prints the same two files as 40.70 kB and 4.72 kB because it counts 1 kB = 1,000 bytes with a different gzip level, so the two figures are not a discrepancy. The offline zip is 371,538 bytes | measured from `dist/` and `release/`; the gzip sizes recomputed independently |
| W9 | The five submission screenshots were regenerated for this build (the storm decision layout changed) at 1280x720, with the Mission Control capture scrolled so the three Choose buttons are in frame. Across two runs of the final script four are pixel-identical and the threads image differs by 4 of 921,600 pixels (animation timing). Earlier runs of the same script showed up to 1,350 differing pixels in that image and 2 in the Mission Control image, so treat the threads image as visually identical, not byte-identical | `scripts/screenshots.py`, compared pixel by pixel |
| W10 | `RELEASE_CHECKLIST.md` (31 lines) lists ten items with their honest state, lists six licence options and chooses none | `tests/docs/release-checklist.test.ts` |
| W11 | Ledger ids are now unique across the whole file (the Phase 5 share-link and deploy rows were renumbered SH1, SH2 and DP7 to stop colliding with the Phase 1 computed-value rows and with the event row E7) | `tests/docs/ledger.test.ts` |

### Process notes (Phase 7)

| # | Note |
|---|---|
| N10 | At the start of the phase the source folder was identical to my Phase 6 zip. During the phase another writer again added files to it: the video kit (Slice 4), and edits to `CHANGELOG.md`, `KNOWN_ISSUES.md`, `docs/judge-review.md` and `docs/video-script.md`. I read all of it, found it accurate and consistent with my measurements, kept it, and corrected the one wrong sentence (W6). I did not re-do it. The owner asked to be told about differing files; they are listed in the Phase 7 report |
| N11 | Verifying a claim already in the ledger found it false: "npm audit: 0 in total". It is 0 for what ships and 11 moderate advisories in the lint tools; corrected in H1 and recorded in KNOWN_ISSUES |

## Phase 8 additions (event-day completion and release gate, 2026-11-11)

### What was and was not supplied

| # | Item |
|---|---|
| W12 | All six input blocks were empty: A official event text, B team, C live URL, D video link, E licence ("undecided"), F player bug notes. **Skipped, as the rules require:** Slice 1 (rules to ledger), Slice 2 (submission text), Slice 3 (licence), Slice 4 (bugs). Consequences, all still true: E3 to E7 stay UNVERIFIED; the four placeholders in `docs/submission.md` stay open; no `LICENSE` file exists; no player bug was reproduced; no deployed URL was audited. Nothing was invented to fill the gap. No compliance problem can be reported because no official text was available to compare against |
| W13 | Two items from the skipped Slice 1 do not depend on input and were done: the stale "Last updated" line at the top of this ledger now reads 2026-11-11 (Phase 8), and the README status line that still said "Phase 6: features frozen" now says the features have been frozen since Phase 6 |
| W14 | The Judging and Awards Guide is listed as due Nov 13 (E2). Today is Nov 11, so it may not be published yet; this was not checked. The README "Pre-event rules check" still stands |

### Slice 5: release gate

| # | Claim | How it was checked |
|---|---|---|
| W15 | `npm run audit:all` passes all 9 stages, exit 0: 468 of 468 unit and DOM tests (with typecheck and lint), browser audits of 84, 49, 42 and 41 checks, the offline package builds, and its 11-check smoke audit passes from a fresh unzip. Chromium only | run in this session, one command, 2026-11-11 |
| W16 | First load is 44.3 KB gzipped (page 308 bytes, script 40,350, style 4,700; gzip level 9, 1 KB = 1,024 bytes), under the 60 KB limit. The launch animation file measures 308.9 KB the same way (Vite prints about 321 kB with its own gzip level and 1 kB = 1,000 bytes; same explanation as W8). The offline zip is 371,538 bytes, identical to Phase 7 | measured from `dist/` and `release/` |
| W17 | The five submission screenshots were regenerated: five files, all 1280x720. Four are pixel-identical to the Phase 7 set; the threads image differs by 20 of 921,600 pixels (animation timing). The Mission Control image was looked at: the three Choose buttons are in frame | `scripts/screenshots.py`, compared pixel by pixel |
| W18 | The `CHANGELOG.md` 1.0.0 date was set to 2026-11-11 at the owner's instruction. The pinned test `tests/docs/release-docs.test.ts` required the literal `YYYY-MM-DD`; it was changed on purpose (not loosened) to accept the placeholder or a real calendar date, and it rejects a made-up date such as 2026-13-45. The `git tag` command is unchanged and is for the owner to run; this folder is not a git repository | `npm run check` |
| W19 | `RELEASE_CHECKLIST.md` now carries evidence for each item. DONE: demo (local), offline zip, screenshots, known issues. NOT DONE: deployed URL, video, submission text, licence, event rules E3 to E7, tag. Items 2, 4, 7 and 8 also say "owner must confirm" | `tests/docs/release-checklist.test.ts` |
| W20 | **Corrected:** the lint-toolchain advisory count. Phase 7 recorded 11 moderate advisories (H1, N11); `npm audit` on 2026-11-11 reports 10 affected packages in the same chain (eslint, `@eslint/js`, `@eslint/config-array`, typescript-eslint and its parser, plugin and utils, `minimatch`), 0 high, 0 critical, and `npm audit --omit=dev` reports 0. H1 and N11 are left as the Phase 7 record; `KNOWN_ISSUES.md` and `CHANGELOG.md` now give the current count and say it can change with the advisory database | `npm audit`, `npm audit --omit=dev` |

### Slice 6: judge Q&A

| # | Claim | How it was checked |
|---|---|---|
| W21 | `docs/qa.md` has ten questions, each answered in two or three sentences, about 630 words. Every number in it must appear in this ledger or the docs. The docs do not record why the team chose a Moon orbiter, nor who wrote what between the team and the AI, so those two answers stop at what the docs say and end in a visible "Owner to add" line; nothing about authorship is claimed | `tests/docs/qa.test.ts` (5 tests; the number and sentence-count checks were shown to fail when broken on purpose) |

### Process notes (Phase 8)

| # | Note |
|---|---|
| N12 | The uploaded file was named `threadline-phase7.zip`; the task text called it `threadline-phase7_1.zip`. Its contents matched the stated Phase 7 state (49 test files, 468 tests) |
| N13 | The first `audit:all` run was started as a background job and was killed between tool calls, so it produced no result and none was counted. It was re-run detached from the start and completed; the figures above come only from that complete run |

## Phase 9 additions (2026-11-15)

### Official rules read from the two guides (both dated 13 Nov 2026)

| # | Rule | Source (page) | Where the project meets it |
|---|---|---|---|
| E8 | Demo is a slide deck of at most 7 slides including the title, or a video of at most 30 seconds. Over either limit makes the project ineligible for Global Judging. Public link, no login. | Judging Guide p. 3; Submission Guide pp. 11-12 | `docs/demo/threadline-demo-7slides.pdf` (7 slides); `docs/demo/demo-30s.md`; tests/docs/demo.test.ts |
| E9 | Demo slides must show team name, member names, the challenge, an image of the project, the user experience, and how NASA data/resources made it possible | Submission Guide pp. 11-12 | Deck content, pinned by tests/docs/demo.test.ts |
| E10 | Form fields, in order: Project Name; High-Level Summary; Link to Project Demo; Link to Final Project; Detailed Project Description; Use of SI; NASA Data; Space Agency Partner Data and Other References. Two checkboxes the owner ticks. | Submission Guide pp. 7-10; Judging Guide p. 3 | `docs/submission-form.md`; tests/docs/submission-form.test.ts |
| E11 | Submit before Sunday 15 November 2026, 11:59 p.m. local time of the Local Event (Universal: the Team Owner's local time); a saved but unsubmitted project is not eligible | Judging Guide p. 3; Submission Guide p. 13 | RELEASE_CHECKLIST.md; only the owner can click "Submit for Judging" |
| E12 | Image uploads: JPG, PNG or GIF up to 10 MB each; no video or document upload. Test both links in a private browser window; a site blocked by a network filter can be classified by FortiGuard (Company "N/A") | Submission Guide pp. 5-6 | `submission/screenshots-si/`; checklist in `docs/submission-form.md` |
| E13 | No image, video or likeness of anyone under 18 | Submission Guide p. 13 | The deck and screenshots show no person; the owner must keep it so if recording voice or video |
| E14 | Teams are reviewed under NASA's China funding restriction policy before Global Judging; the guide points to the Terms and Conditions | Judging Guide p. 4 | Nothing to build. The owner reads the Terms |
| E15 | Both checkbox texts (terms; original work with all external code, text and images listed in the References field, no copyrighted material without permission) | Judging Guide p. 3 | Field 8 of `docs/submission-form.md` lists the code, text and images; the owner ticks |

### What the guides do NOT say (so nothing here is claimed)

- No theme name (E6). No rule on pre-event work (E4). The Challenge page ("Potential Considerations") and the Participant Terms were not supplied.
- The Resources tab items (GMAT, Mission Viz, Mission Design Lab, Concept Maturity Levels, CubeSat 101 and others) were named by the owner but nobody has said Threadline used any of them, so none is claimed as used.

### Verified by running something

| # | Claim | How it was checked |
|---|---|---|
| S14 | 547 unit and DOM tests pass in 54 files, and `npm run audit:all` passes all 9 stages (browser audits 84, 49, 42, 41 checks; offline smoke 11/11). It includes the 30-second and 7-slide demo limits, the form character counts, and the SI acknowledgment in every place it is promised. The first run after the footer change failed three audit checks (the new SI link was under the 44 px touch-target rule; one audit pinned the old placeholder); both were fixed and the audit re-run | `npm run check` and `npm run audit:all`, 2026-11-15 |
| S15 | `src/sim` is byte-identical to the Phase 8 baseline | `diff -r` against the uploaded zip, 2026-11-15 |
| S16 | First load 44.1 KB gzipped (40,465 B script + 4,738 B style); Phaser (318,146 B gzipped) still loads only for the launch | gzip of the production build |
| N14 | Found while listing references: eventemitter3 (a runtime dependency of Phaser) was missing from the Attributions page. Added, and the licence test now reads the non-dev packages from package-lock.json | tests/docs/licenses.test.ts |
