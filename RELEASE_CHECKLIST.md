# Release checklist (one screen)

State is for **this build** (1.0.1), checked 2026-11-15 (Phase 9). DONE means a command was run and its result is quoted. "Owner must confirm" needs a human. **Deadline: Sunday 15 November 2026, 11:59 p.m. local time** (Local Event local time; Universal: the Team Owner's local time), by clicking "Submit for Judging" (Judging Guide p. 3; Submission Guide p. 13). Inputs not supplied: event type, live and repository URLs, the Participant Terms, the challenge page.

| # | Item | State now | Evidence / how to check |
|---|---|---|---|
| 1 | **Deployed URL loads** | NOT DONE (no live URL supplied; the deployed-build audit was not run) | Local `/threadline/` path audit passes. After deploying: `BASE_URL=https://<you>.github.io/threadline python3 scripts/browser-audit-phase5.py`, then open both links in a private window |
| 2 | **Demo works** | DONE locally (Chromium). Owner must confirm on the live URL | `npm run audit:all`: phase 4 audit and offline audit pass. By hand: `/?demo=1`, **Skip to the outcome** |
| 3 | **Offline zip works** | DONE | `release/threadline-offline.zip` rebuilt (now with `LICENSE` and `SI_DISCLOSURE.md`); smoke audit from a fresh unzip with outside requests blocked. On the judging computer: `node serve.mjs` (`docs/offline.md`) |
| 4 | **Screenshots current** | DONE. Owner must look at all five | Regenerated: `submission/screenshots/` (1280x720) and the SI-marked copies in `submission/screenshots-si/` (use these for the form) |
| 5 | **Official demo ready** | DONE as files; slide 7 shows `[OWNER: add the live link]` until the URL exists | `docs/demo/threadline-demo-7slides.pdf` (7 slides) and the 30 s script; rebuild with `LIVE_URL=... node scripts/build-demo-deck.mjs`. Over 7 slides or 30 s = ineligible for Global Judging |
| 6 | **Submission text complete** | NOT DONE: `[OWNER: ...]` placeholders remain | `docs/submission-form.md` (eight fields in the official order): event type, links, who had the idea, mission concept. Then `node scripts/count-form-chars.mjs` |
| 7 | **Licence** | DONE: MIT, Copyright (c) 2026 Sagar (`LICENSE`, `package.json`). Owner must confirm the holder name | The Phaser, zustand and eventemitter3 notices are on the Attributions page |
| 8 | **Known issues honest** | DONE. Owner must confirm | `KNOWN_ISSUES.md` re-read 2026-11-15; Firefox and Safari still listed as not run |
| 9 | **Event rules checked** | PARTLY: E2, E3, E5, E7 verified from the two guides; E4 (pre-event coding) and E6 (theme name) NOT DONE | `docs/truth-ledger.md`. Read the Participant Terms for E4. Universal Event needs 2+ people |
| 10 | **GitHub Pages** | NOT DONE (owner) | Repo public, named `threadline`; Settings > Pages > Source: GitHub Actions; push to `main`; check the Actions run. README "Deploy" |
| 11 | **Submit for Judging** | NOT DONE (only the owner can) | Both checkboxes ticked, all required fields complete, then submit before the deadline. A saved project is not submitted |
| 12 | **Tag** | NOT DONE (owner runs it). `CHANGELOG.md` 1.0.1 is dated 2026-11-15 | `git tag -a v1.0.1 -m "Threadline 1.0.1" && git push origin v1.0.1` after committing |

## Before you submit

`npm run audit:all` last run 2026-11-15: **ALL 9 STAGES PASSED** (547/547 tests, browser audits 84, 49, 42, 41 checks, offline 11/11; offline zip 376,361 bytes; first load about 44 KB gzipped: 40,465 B script + 4,738 B style). Run it once more after any change. Anything not ticked above goes in `KNOWN_ISSUES.md`, not in the submission text. Documents relied on: `docs/offline.md`, `docs/demo/`, `docs/submission.md`, `docs/truth-ledger.md`, `CHANGELOG.md`.
