# Threadline

> Every choice leaves a trace.

A browser game where you are Mission Director for a Moon-orbiter mission. Design the spacecraft, watch the launch, then trace a mid-mission crisis back to the decision that caused it, and rewind to change it.

*Independent project created for the NASA Space Apps Challenge. Not affiliated with or endorsed by NASA.*

## 30-second pitch

Space missions are chains of trade-offs, but in a textbook the chain is invisible. In Threadline you are Mission Director for a Moon orbiter. Pick three instruments, a launcher, a battery and a solar array, and watch coloured threads link each choice to the weight, power, cost, fuel, data and science it moves. Launch, fly through a solar storm, and make one in-flight decision. Then follow the cause chain from the outcome back to the choice that mattered, and rewind: same seed, same luck, only your decision changes. You do not read about trade-offs. You feel them.

It is a game model, not a simulator. Every number is labelled GAME MODEL, SIMPLIFIED PHYSICS or NASA DATA, and the Science Cards show their sources. See `docs/how-it-works.md`. Submission (Phase 9): `docs/submission-form.md` (the eight official fields, ready to paste), `docs/demo/` (the 7-slide deck as .pptx and .pdf, the 30-second script and captions), `SI_DISCLOSURE.md`, `LICENSE`.

## How to play (about 10 minutes)

1. **Start mission**, then **Open the Design Bay**. A short guide walks you through the first steps; skip it any time.
2. Tick **three instruments**, choose a **launcher**, set the **battery** and **solar array**, and press **Auto-size fuel**. The meters and threads show what each choice did. If the **launch check** says you cannot launch, it tells you why and how to fix it.
3. Press **Launch** (Space skips the animation). In **Mission Control**, a solar storm arrives. Choose how to respond: each answer shows its cost and its risk, and none is recommended.
4. Read the **outcome**: a tier, four scores, and the top three cause chains. **Why did this happen?** opens a Science Card with sources.
5. Press **Change one decision** to rewind. The seed stays the same, so the luck is identical. The **diff** shows what your decision changed.
6. Try another **mission variant** on the Brief screen, or press **Copy link** on the outcome to challenge a friend.

The official Space Apps demo is the 7-slide deck in `docs/demo/` (limits: 7 slides or 30 seconds). Judges who want to click through the game itself: use the in-game 90-second Demo Mode (`?demo=1`, or **Try the 90-second demo** on the title screen). Click-by-click: `docs/demo-script.md`. Video outline: `docs/video-script.md`.

## Honest limitations

What is real, what is invented, and what a human still has to check. Details: `docs/truth-ledger.md`.

**Game model, on purpose (not real):** every number labelled **GAME MODEL** (instruments, launchers, budget, storm, data link, scoring and tier cut-offs, variant numbers); the reduced physics labelled **SIMPLIFIED PHYSICS** (circular orbit, fixed eclipse, no thermal effects, one lumped burn budget); one lunar mission; the storm is a game rule, not a forecast. Only values labelled **NASA DATA** (the Moon's radius, gravitational parameter and mean distance) come from a NASA page.

**A human must check before submission:**
- **Event rules E4 and E6:** pre-event coding (the Participant Terms were not supplied) and the theme name (the two official guides do not state it). Verified on 2026-11-15 against the Judging & Awards Guide and Project Submission Guide (both dated 13 Nov 2026): team size and the 2-person rule for the Universal Event (E3), the five judging criteria (E5), the SI rules (E7), the deadline and the demo limits (E8, E11).
- **Owner-only items:** event type (Local or Universal), the live and repository links, who had the idea (the SI rules say SI must not be used to come up with it), and ticking the two form checkboxes.
- **Placeholders P1 to P4:** engine efficiency and the three burn budgets. The fuel meter carries an "Unverified placeholder" badge everywhere, including on phones.
- **Constants K1 and K2:** g0 and the speed of light are defined constants, but no NASA page is cited for them.
- **Sources:** open each Science Card source once. Eight of nine pages were read only as search excerpts; the GAO review is from 2001.
- **Deploy:** the versions of `checkout`, `setup-node` and Node 22 in the workflow, and the `/<repo>/` project-site path.

**Tested:** Chromium only, by script. No real stranger has played it. Verified in this repository: licences of the shipped libraries (MIT, read from the installed packages), no bundled fonts, the Moon data in the ledger equals the data in the game.

## Release and verification

| Command | What it does |
|---|---|
| `npm run check` | Typecheck, lint and all unit and DOM tests |
| `npm run audit:all` | One verdict: the unit stage, then every real-browser audit (default path, the `/threadline/` deploy path, and the offline package) with a pass/fail table; logs go to `audit-logs/`. Needs Python 3, Playwright and Chromium. Add `--no-browser` for the unit stage only |
| `npm run package:offline` | Builds `release/threadline-offline.zip`, a copy that runs with no internet (`docs/offline.md`) |
| `npm run screenshots` | Writes five repeatable 1280x720 submission images to `submission/screenshots/` (needs a running preview: `npm run build && npx vite preview --port 4173`) |
| `npm run build:pages` / `npm run preview:pages` | Production build and local preview under the `/threadline/` base path |
| `npm run sweep` | The balance sweep (`SWEEP=1` prints the tables) |

**Documents.** Release: `CHANGELOG.md`, `KNOWN_ISSUES.md`, `docs/offline.md`, `docs/cross-browser.md` (Firefox and Safari were **not** run; manual steps are there), `docs/judge-review.md`, `docs/submission.md`, `docs/truth-ledger.md`. Judges: `docs/qa.md` (ten likely questions, honest answers), `docs/demo-script.md`, `docs/video-script.md` and the video kit in `docs/video/` (captions, shot list, recording checklist), `docs/how-it-works.md`.

## Status

**Features frozen since Phase 6** (Phases 6 to 9: fixes, docs, packaging, the release gate and, in Phase 9, the official-rules submission pack; the simulation in `src/sim` is unchanged since Phase 8). Built in phase 5: Playable loop: Title, Brief (with three mission variants), Design Bay, Launch, Mission Control (data storage, a solar storm, one in-flight decision), Outcome, Rewind (a design choice or the storm answer), Outcome diff. Guided first run, Demo Mode, six sourced Science Cards, saved progress, share links, high-contrast and text-size settings, static deploy (see Deploy below). Not built: the optional antenna-alignment mini-game, audio, live NASA data, extra missions. Tier definitions: `docs/tiers.md`. Balance reports: `docs/balance-sweep.md`, `docs/balance-variants.md`.

## Use of Super Intelligence (SI)

Built with SI assistance (Claude, Anthropic). Claude wrote most of the code, the tests and checks, the documentation and the demo slides. No audio and no data were generated, and no NASA logos or branding were used. Details and the list of places where this is marked: [`SI_DISCLOSURE.md`](SI_DISCLOSURE.md). This README does not say who had the idea or the mission concept; the owner states that in the submission form.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (add ?seed=42 for a fixed mission)
npm run check      # typecheck + lint + tests
npm run build      # production build in dist/ (Phaser is a separate lazy chunk)
npm run sweep      # balance sweep over 2,880 designs (SWEEP_WRITE=1 also writes docs/balance-sweep.md)
```

Real-browser audit (optional, needs `pip install playwright && playwright install chromium`):

```bash
npm run build && npx vite preview --port 4173 &
python3 scripts/browser-audit.py     # prints PASS/FAIL per check, saves screenshots to audit-shots/
```

## How the pieces talk

- `src/sim` is the engine (pure). Only the zustand store (`src/core/store.ts`) calls `simulate()`; the UI reads previews, cause chains and diffs.
- DOM screens (`src/ui`) own every screen. Phaser lives only in `src/scenes` and runs only on the launch screen.
- DOM to Phaser: a plain `LaunchPlan`. Phaser to DOM: `onPhase(caption)` and `onDone()`. See `src/scenes/launch-contract.ts`. Phaser never imports the store, the UI or the sim (ESLint enforces it).

## Architecture rule

`src/sim` is pure TypeScript: no DOM, no Phaser, no `Date`, no `Math.random`. ESLint (`eslint.config.js`) and a no-DOM TypeScript config (`tsconfig.sim.json`) enforce it, and `tests/lint/sim-boundary.test.ts` proves the lint rule fires.

## Before relying on any rule or number

See `docs/truth-ledger.md`.

## Pre-event rules check (Space Apps)

Checked against the two official guides on 2026-11-15 (details and page numbers in `docs/truth-ledger.md`, E2 to E15):

- Team: at most 6; Local Event at least 1 person, **Universal Event at least 2** for Global Judging. This project has one member, Sagar, so the event type decides eligibility. [OWNER: confirm Local or Universal.]
- Demo: a slide deck of at most 7 slides including the title, or a video of at most 30 seconds. Public link, no login, English.
- Deadline: **Sunday 15 November 2026, 11:59 p.m. local time**, by clicking "Submit for Judging". Saved is not submitted.
- Five judging criteria, each scored 1 to 5: Impact, Creativity, Validity, Relevance, Presentation.
- SI use is allowed but must not be used to come up with the idea of how to solve the challenge, and must be marked: see "Use of Super Intelligence (SI)" above.

Still unchecked, because the document was not supplied: the Participant Terms and Conditions. Look there for any rule on work begun before the event, on pre-existing code, and on originality (E4), and read the China funding restriction policy the Judging Guide mentions (p. 4).

## Deploy (GitHub Pages)

Why GitHub Pages: it is free, lives next to the CI in the same repository, and a static site needs only a base path (no server, no account system). Netlify or any static host also works: upload `dist/` built without `--base`.

1. Create a **public** GitHub repository named **`threadline`** (the name becomes the base path, and the build already uses `/threadline/`). Judges must be able to open it without logging in. Push the project, including `LICENSE`, `SI_DISCLOSURE.md` and `docs/demo/`.
2. In the repository: **Settings > Pages > Source: GitHub Actions**.
3. Push to `main`. `.github/workflows/ci.yml` runs `npm run check`, builds with `--base=/<repo>/`, runs `scripts/postbuild.mjs`, and publishes `dist/`. Check the Actions run is green.
4. Open `https://<your-user>.github.io/threadline/`. The workflow summary shows it. Test it in a private window (no login).
5. Put that address in field 4 of `docs/submission-form.md`, rebuild the deck with it (`LIVE_URL=... node scripts/build-demo-deck.mjs`, see `docs/demo/`), and push again. The guide (Submission Guide p. 6) suggests requesting a FortiGuard Web Filter Classification for a new site (Company Name "N/A") so judges' networks do not block it.

Deploy by hand, or test the production build locally:

```bash
npm run build:pages        # type check + vite build --base=/threadline/ + 404.html + .nojekyll; fails if a source map ships
npm run preview:pages      # serves it at http://localhost:4173/threadline/
BASE_URL=http://localhost:4173/threadline python3 scripts/browser-audit-phase5.py
```

If the repository is not named `threadline`, build with `npx vite build --base=/<repo>/ && node scripts/postbuild.mjs`.

Notes: no source maps are published; `404.html` is a copy of `index.html` (the app is one page); `attributions.html` is a static page linked from the footer. The GitHub Action versions in the workflow are written from memory and are UNVERIFIED: check and pin them on each action's GitHub page before relying on the deploy.
