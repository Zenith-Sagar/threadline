# Submission form: copy-paste pack

Source of the fields and their order: *NASA Space Apps Challenge 2026, Project Submission Guide* (dated 13 Nov 2026), "Project Page Form Field Instructions" (pp. 7-10). The guide says the demo "will be considered in your overall project evaluation, but the majority of judges' evaluation will be based on your project submission" (p. 7), so these fields matter more than the demo. Each field below is one fenced block: copy what is inside it. Counts are in characters as pasted (a line break counts as 1). The guides state no character limits, so none is assumed; check the counts against the form itself.

**Things only the owner can do or say are marked `[OWNER: ...]`.** Fill them, then run `node scripts/count-form-chars.mjs` to refresh the counts. Nothing here says who had the idea or what the AI wrote beyond what is factual; those answers are yours (field 6).

Team and event facts that are not in a field (they live on the Members tab and in your event registration): team name **Threadline**; the only team member is **Sagar**, a registered human. The AI is not a team member and is not listed as one. Challenge chosen: **Space Mission Design Game** (Intermediate, Beginner/Youth; subject Games), as you supplied it. [OWNER: your event type (Local or Universal) was not filled in. Judging & Awards Guide p. 3: a Local Event team needs at least one person, a Universal Event team at least two, to be eligible for Global Judging.]

## 1. Project Name

**Characters: 10**

```text
Threadline
```

## 2. High-Level Project Summary

Guide prompts: what you developed, how it addresses the challenge, why it is important.

**Characters: 745**

```text
Threadline is a browser game for the Space Mission Design Game challenge. You are Mission Director for a Moon orbiter: you choose three instruments, a launcher, a battery, a solar array, fuel and data storage, then fly through a solar storm with one in-flight decision. Coloured threads link every choice to the weight, power, cost, fuel, data and science it moves, and every outcome is traced back to the decision that caused it. Rewind keeps the same random seed, so you can change one decision and see exactly what it did. It matters because the trade-offs in mission design are usually invisible: here you can see and replay them. It is a game model, not a simulator, and every number is labelled NASA DATA, SIMPLIFIED PHYSICS or GAME MODEL.
```

## 3. Link to Project Demo

Public link, no login. Submit the **7-slide PDF** (it has no voice or face, and is inside the 7-slide limit). Before you do: replace `USER`, make the repository public, rebuild the deck with your live link on slide 7 (see `docs/demo/demo-30s.md`), commit the PDF, and open this link in a private window.

**Characters: 91 (provisional: it still contains [OWNER: ...] placeholders)**

```text
[OWNER: https://github.com/USER/threadline/blob/main/docs/demo/threadline-demo-7slides.pdf]
```

## 4. Link to Final Project

**Characters: 43 (provisional: it still contains [OWNER: ...] placeholders)**

```text
[OWNER: https://USER.github.io/threadline/]
```

## 5. Detailed Project Description

Answers the five questions in the guide: what it does, how it works, benefits, what you hope to achieve, tools and languages.

**Characters: 3425 (provisional: it still contains [OWNER: ...] placeholders)**

```text
WHAT IT DOES
Threadline is a browser game for the "Space Mission Design Game" challenge. The player is Mission Director for a Moon-orbiting mission. In the Design Bay they pick three instruments, a launcher, a battery, a solar array, fuel and data storage, and coloured threads show which meters each choice moves: weight, power, cost, fuel, data and science. After launch, a solar storm hits on an orbit the player cannot predict. They get one in-flight decision; each answer shows its cost and its risk, and none is recommended. The outcome screen gives a tier, four scores and the top cause chains, each traced from a decision the player made, through a resource, to the result. Rewind keeps the seed, so the luck stays identical and only the decision changes; a diff shows the effect. Also built: a guided first run, four mission variants, share links, saved progress and a 90-second demo mode.

HOW IT WORKS
The whole simulation is one pure, deterministic function. The Design Bay preview runs the same loop as the flight, so the meters never disagree with the result. Luck comes only from the seed, which makes Rewind fair. While it simulates, the game keeps a log of causes, so each explanation is built from the player's own decisions. Balance was checked by sweeping thousands of designs for dominant strategies before the interface was built. Every number on screen carries a label: NASA DATA, SIMPLIFIED PHYSICS or GAME MODEL. The Moon's radius, gravitational parameter and Earth-Moon distance come from NASA's Moon Fact Sheet; everything else is invented for play and says so. A Truth Ledger records every real-world claim with its source, or marks it unverified, and automated tests check the ledger against the data file. The game's stages line up with the four mission segments named in the challenge resources: launch (launcher choice and launch), space (spacecraft and instruments), ground (downlink and Mission Control), user (science return and the outcome). That is a structural match only.

BENEFITS
A player can see, replay and test cause and effect in mission design instead of only reading about it. Rewind turns "what if I had chosen differently?" into a one-click experiment. Honest labels show which numbers are real and which are invented. It needs no account, no server and no install, and an offline package runs with no internet. It has high-contrast and text-size settings. It has been checked in Chromium only and no stranger has played it yet.

WHAT WE HOPE TO ACHIEVE
To make the chain from decision to consequence in space mission design something a player can see and replay: you do not read about trade-offs, you feel them. Next: sourced numbers in place of the placeholders, more missions, and tests with real first-time players. Not built: team play, orbit options, objective definition, a sandbox, leaderboards, audio, live NASA data.

TOOLS, LANGUAGES, HARDWARE
TypeScript 6.0.3, Vite 8.3.4 (build), Phaser 3.90.0 (launch animation only), zustand 5.0.15 (state), Vitest 5.0.3 and happy-dom 21.0.4 (tests), ESLint 10.12.0 (lint), Python Playwright 1.63.0 with Chromium (browser audits and screenshots). Static site, hosted on GitHub Pages [OWNER: confirm]. No special hardware. SI: Claude (Anthropic) wrote most of the code, tests and documentation; see the Use of SI field and SI_DISCLOSURE.md in the repository. Source code (MIT licence): [OWNER: https://github.com/USER/threadline]
```

## 6. Use of Super Intelligence (SI)

Data-collection only: judges do not see this field. Rules from the guide: SI is allowed; it must **not** be used to come up with the idea of how to solve the challenge; you must say clearly where and how SI was used. **The three `[OWNER]` lines are yours to write, in your own words and only what is true.** Do not paste any line about where the idea originated unless that is what happened.

**Characters: 1248 (provisional: it still contains [OWNER: ...] placeholders)**

```text
Yes, SI was used. Tool: Claude, made by Anthropic.

Where and how: Claude wrote most of the game's code (TypeScript), the automated tests, the documentation and the text of this submission, working in prompted sessions with the project owner. Claude also produced the 7-slide demo deck and the 30-second demo script from the project's own documents and screenshots. The simulation, the checks and the Truth Ledger were verified by running the automated tests and browser audits, not by trusting the SI's own statements.

SI-generated material and its marking: code, text and the demo slides are acknowledged in the README, SI_DISCLOSURE.md, the in-game Attributions page, a meta tag in the page, a footer line in the game, the footer of every demo slide, and the demo files' metadata. The screenshots and slides carry the visible line "Built with SI assistance (Claude, Anthropic)". There is no SI-generated audio. No NASA logos or branding were used or generated.

Who came up with the idea of how to solve the challenge: [OWNER: write this in your own words.]
Who came up with the mission concept (Moon orbiter, trade-offs, Rewind): [OWNER: write this in your own words.]
Anything else about how you used SI: [OWNER: add it, or delete this line.]
```

## 7. NASA Data

At least one NASA data set or resource is required for a Global Award.

**Characters: 1798**

```text
NASA data used: Moon Fact Sheet, NASA Space Science Data Coordinated Archive, https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html (read 2026-10-10).

Three values from that page, and where each is used:
1. Volumetric mean radius, 1737.4 km. Used as the Moon's radius in the orbit calculation (orbit radius = this radius + 100 km altitude). It sets the orbit period and the longest eclipse per orbit.
2. Gravitational parameter (GM), 0.00490 x 10^6 km^3/s^2 (the sheet gives three significant figures). Used for the circular orbit speed and the orbit period.
3. Mean Earth-Moon distance (semimajor axis), 0.3844 x 10^6 km. Used only for the one-way light-delay figure shown in Mission Control. It is display only.

The data file also holds nine other values from the same page (for example surface gravity, escape velocity, perigee and apogee). The game does not use them.

Computed by us from those values and labelled SIMPLIFIED PHYSICS in the game: the orbit period at 100 km altitude (about 118 minutes), the longest time in the Moon's shadow per orbit (about 46 minutes) and the light delay (about 1.3 seconds). They assume a circular orbit and the Sun in the orbit plane.

GAME MODEL, not NASA data: the 100 km altitude; every instrument, launcher, battery, array, fuel, storage and data-link number; the budget; the storm and its damage chance; the scoring thresholds and tier cut-offs; the four mission variants. The engine efficiency and the three burn budgets are unverified placeholders and are marked "Unverified placeholder" wherever they appear.

The Science Cards in the game cite NASA and other pages for their ideas; the cards contain no numbers. Those pages are listed under References. Threadline is an independent project and is not affiliated with or endorsed by NASA.
```

## 8. Space Agency Partner Data and Other References

Guide: list **all** code, text and images used, even open source.

**Characters: 3864 (provisional: it still contains [OWNER: ...] placeholders)**

```text
SPACE AGENCY PARTNER DATA
No data or resources from the 2026 Space Agency Partners are used in the game. [OWNER: confirm this is true. CSA and other partner resources appear on the challenge's Resources tab; if you used one, say so here.]

CODE
Threadline's own source code was written with SI assistance (Claude, Anthropic) for this event and is released under the MIT licence (Copyright (c) 2026 Sagar). [OWNER: https://github.com/USER/threadline]
Third-party code shipped to players (name, version, licence, read from package-lock.json and node_modules):
- phaser 3.90.0, MIT
- zustand 5.0.15, MIT
- eventemitter3 5.0.4, MIT (a Phaser dependency)
Third-party code used only to build, test and check (not shipped):
- typescript 6.0.3, Apache-2.0
- vite 8.3.4, MIT
- vitest 5.0.3, MIT
- eslint 10.12.0, MIT
- @eslint/js 10.0.1, MIT
- typescript-eslint 8.71.1, MIT
- globals 17.13.0, MIT
- happy-dom 21.0.4, MIT
- @types/node 26.6.5, MIT
- 153 further packages pulled in by these, listed with their licences in package-lock.json (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, BlueOak-1.0.0)
Tools used to make the screenshots and the demo files: Playwright for Python 1.63.0 (Apache-2.0) with Chromium; Pillow 12.3.0 (MIT-CMU); pypdf 6.17.0 (BSD-3-Clause); pptxgenjs 4.0.1 (MIT); LibreOffice 24.2 (MPL-2.0).

TEXT
- NASA Moon Fact Sheet, NASA Space Science Data Coordinated Archive, https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html (three numbers, see NASA Data).
- Sources behind the nine Science Card references (ideas only, no numbers; each page read 2026-10-16):
  1. Control Algorithms Charge Batteries Faster (NASA Spinoff 2011), NASA Glenn Research Center, https://ntrs.nasa.gov/api/citations/20120001911/downloads/20120001911.pdf
  2. State-of-the-Art Small Spacecraft Technology: Power, NASA Small Spacecraft Systems Virtual Institute, https://www.nasa.gov/wp-content/uploads/2023/05/3.-soa-power-2022.pdf
  3. Earth Calling (NASA educator guide), NASA, https://www.nasa.gov/wp-content/uploads/2011/08/583093main_earth_calling.pdf
  4. How Do Space Weather Effects & Solar Storms Affect Earth?, NASA Goddard Scientific Visualization Studio, https://svs.gsfc.nasa.gov/31248
  5. How does solar variability affect human society, technological systems and the habitability of planets?, NASA Science, https://science.nasa.gov/heliophysics/science-questions/how-does-solar-variability-affect-human-society-technological-systems-and-the-habitability-of-planets
  6. MAVEN Status Update: Nov. 20, 2014, LASP, University of Colorado, https://lasp.colorado.edu/maven/2014/11/20/maven-status-update-nov-20-2014/
  7. Survey of NASA's Lessons Learned Process (GAO-01-1015R), U.S. Government Accountability Office, https://www.gao.gov/products/gao-01-1015r
  8. Learn the rocket equation, part 1, The Planetary Society, https://www.planetary.org/blogs/guest-blogs/2017/20170428-the-rocket-equation-part-1.html
  9. How 'safe mode' protects space telescopes like Hubble and TESS, Popular Science, https://www.popsci.com/science/safe-mode-space-telescope/
- All other text (game text, documentation, this form) was written with SI assistance (Claude, Anthropic).

IMAGES
- Screenshots of the game itself and the 7 demo slides, made with SI-assisted code. Each carries the visible line "Built with SI assistance (Claude, Anthropic)".
- No other images. No NASA images, logos or branding. No photographs of people.

FONTS, AUDIO, VIDEO
- No fonts are bundled (system fonts only). No audio. No video is used in the game.

CHALLENGE RESOURCES TAB
[OWNER: list only the Resources-tab items you actually opened or used, and how. If you used none, write "None used as data or software." The game's stages line up with the four mission segments named under "Design and Develop Science Missions"; that is a structural match, not a use of the resource.]
```

---

## Official checkboxes (you tick these by hand; nobody else can)

- [ ] I have read and agree to the terms (the form's terms checkbox).
- [ ] The project is our team's original work; all external resources are listed above; we have no copyrighted materials that we lack permission to use.

## Submission checklist

- [ ] **Event type and team.** Your event type is `[OWNER: Local / Universal]`. If Universal, you need at least 2 registered members for Global Judging (Judging & Awards Guide p. 3). Every member must be registered and on the Members tab (max 6). The AI is not a member.
- [ ] **Repository public**, named `threadline`, with the MIT `LICENSE` file, `docs/demo/` and `SI_DISCLOSURE.md` committed.
- [ ] **GitHub Pages is on** and the live link loads (RELEASE_CHECKLIST.md, "Deploy to GitHub Pages"). Optional but recommended by the guide (p. 6) for a new website: request a FortiGuard Web Filter Classification (Company Name: "N/A") so judges' networks do not block the site.
- [ ] **Slide 7 of the deck has the real live link** (rebuild with `LIVE_URL=...`), and the PDF in the repository is the rebuilt one.
- [ ] **Public-link test in a private window:** open the demo link and the final-project link logged out. Both must load with no login, permission or registration (guide pp. 5-6). If judges cannot open it, it cannot be judged.
- [ ] **Demo is within the limit:** the deck has 7 slides, or the video is 30 seconds or less (check the exported file). English only. No image, voice or likeness of anyone under 18 (guide p. 13).
- [ ] **Every `[OWNER: ...]` is gone** from the fields above (search this file for `[OWNER`), the three SI lines in field 6 are in your own words, and `node scripts/count-form-chars.mjs` has been re-run.
- [ ] **Image uploads** (the form takes JPG, PNG or GIF up to 10 MB each; no videos or documents, guide p. 5): use the files in `submission/screenshots-si/` (they carry the visible SI line). Check each is under 10 MB.
- [ ] **Both checkboxes ticked** (terms; original work and all external resources listed). All required fields must be complete or the form will not submit.
- [ ] **Click "Submit for Judging" before Sunday 15 November 2026, 11:59 p.m.** local time of your Local Event (Universal: local time of the Team Owner's area of residence). A project that is only saved, or saved or submitted late, is not eligible (guide p. 13). A banner confirms success. You may edit and resubmit until the end; only the last saved submission is reviewed. Submit early, then improve.
- [ ] **Under-18 and eligibility reading:** the Judging Guide (p. 4) says teams are reviewed under NASA's China funding restriction policy and points to the Terms and Conditions. Read those Terms yourself (they were not provided to this project).
