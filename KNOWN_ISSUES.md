# Known issues and limits (v1.0.1)

Honest list. Items marked **OPEN** need a human; nothing here is hidden elsewhere. The sources and the unverified items are in `docs/truth-ledger.md`.

## Not tested

| Issue | Detail |
|---|---|
| **Firefox and Safari** | Firefox and WebKit could not be installed in the build environment, so every audit ran in Chromium only. Twelve manual steps are in `docs/cross-browser.md`. Nothing here claims they work. **OPEN** |
| **Real players** | Real first-time players have not tried it: no stranger has played the game. The skeptical-judge review (`docs/judge-review.md`) is scripted and its times are estimates. **OPEN** |
| **Real touch devices** | Phone layouts were tested only by resizing Chromium to 390 px. **OPEN** |

## Not built

- The optional antenna-alignment mini-game. Audio. Live NASA data. More than one mission.
- Five challenge items the owner named: team play, orbit options, objective definition, a sandbox and leaderboards (`docs/challenge-coverage.md`).

## Needs a human to check

- **Event rules E4 and E6.** Pre-event coding (E4): the Participant Terms were not supplied; look for rules on work begun before the event, pre-existing code and originality. Theme name (E6): the two official guides do not state one. E2, E3, E5 and E7 are verified against the guides dated 13 Nov 2026. **OPEN**
- **Eligibility.** The team is one person. A Universal Event team needs at least 2 people for Global Judging (Judging Guide p. 3). The event type was not supplied. **OPEN**
- **Who had the idea.** The SI rules say SI must not be used to come up with the idea of how to solve the challenge (Submission Guide p. 9). Claude wrote most of this project. Only the owner can say, truthfully, who had the idea and the mission concept; the project states neither. **OPEN**
- **Live and repository links, and the live link on slide 7 of the deck**: not supplied; shown as `[OWNER: ...]`. **OPEN**
- **Challenge page not read.** The challenge text ("Potential Considerations") was not supplied, so `docs/challenge-coverage.md` marks only the five items the owner named and leaves a placeholder for the rest. **OPEN**
- **Placeholders P1 to P4** (engine efficiency and the three burn budgets). They drive the fuel meter, which is badged "Unverified placeholder" everywhere. **OPEN**
- **Constants K1 and K2** (g0 and the speed of light): defined constants, but no NASA page is cited. **OPEN**
- **Science Card sources:** eight of nine pages were read only as search excerpts; the GAO review is from 2001. Open each page once. **OPEN**
- **Deploy workflow:** `checkout@v4`, `setup-node@v4` and Node 22 are unverified; so is the `/<repo>/` project-site path. **OPEN**

## Known rough edges (Low, deliberately not changed)

- The Standard variant shows "Changes: Nothing changes" with a GAME MODEL label.
- Some terms appear outside a tooltip ("eclipse", "safe mode", "Wh", and "Mb" after the Brief, which now spells it out once as "megabits"). Turning the rest into tooltips is a code change, not a copy change, and several of the sentences are pinned by tests, so they were left as they are.
- On phones the sticky meter strip shows titles, bars and status words only; the full numbers are available to screen readers and on wider screens.
- The offline server's 404 page uses relative file paths, so an unknown address nested two or more folders deep shows the game without its styling. The game itself is one page, so this affects only mistyped addresses.

## Technical limits

- The launch animation needs WebGL or canvas through Phaser. Without it (or if its file fails to load) the game uses a text launch and continues; this was tested by injecting failures.
- The launch animation file is about 321 KB gzipped and loads only when a player launches. The rest of the game loads in about 45 KB gzipped.
- Share links are capped at 600 characters; longer or malformed links start a normal game with a visible message.
- A page opened straight from disk (`file://`) is blank; use the offline server (`docs/offline.md`).
- Saved progress uses `localStorage`. If the browser blocks it, the game works and says progress lasts only for that visit.
- **Development toolchain advisories.** `npm audit` reports moderate advisories (10 affected packages when re-counted on 2026-11-11; Phase 7 counted 11), all in the lint tools (eslint, typescript-eslint and the `minimatch` package beneath them; a denial of service in glob matching). They are not part of what ships: `npm audit --omit=dev` reports 0. Every fix npm offers is a breaking downgrade of the linter, so none was applied to a frozen release. Revisit when the lint tools publish a compatible fix. (Ledger H1.)

