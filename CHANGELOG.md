# Changelog

All notable changes. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org).

**To release:** commit, then tag: `git tag -a v1.0.1 -m "Threadline 1.0.1" && git push origin v1.0.1`. The version in `package.json` reads 1.0.1; tests check that it matches the newest entry here and that the date is a real date. The 1.0.1 date is the day the official guides were applied (the event's submission day).

## [Unreleased]

Not in this release: the optional antenna-alignment mini-game, audio, live NASA data, and more than one mission.

## [1.0.1] - 2026-11-15

Submission readiness. No game feature changed and `src/sim` is untouched; this release applies the two official 2026 guides (both dated 13 Nov 2026).

### Added
- **Official demo:** a 7-slide deck (`docs/demo/threadline-demo-7slides.pptx` and `.pdf`) and a 30-second script with captions (`docs/demo/demo-30s.md`, `.srt`), kept inside the official limits by tests. The earlier 2-minute video kit is relabelled optional.
- **Submission form pack:** `docs/submission-form.md`, the eight official fields in order with current character counts (`scripts/count-form-chars.mjs`), a submission checklist, and tests that check every dependency version and licence.
- **SI acknowledgment** in text and metadata: `SI_DISCLOSURE.md`, a README section, the Attributions page, `<meta>` tags, a visible footer line in the game, the offline package, and watermarked screenshot copies in `submission/screenshots-si/`.
- **`LICENSE`:** MIT, Copyright (c) 2026 Sagar; `package.json` `license` field.

### Changed
- Truth Ledger: E2, E3, E5 and E7 verified against the guides, with page numbers; E8 to E15 record the demo, form, deadline, image and under-18 rules. E4 and E6 stay unverified.
- `docs/submission.md`: placeholders for the challenge, team, SI wording and criteria replaced by the real values; what only the owner knows stays marked `[OWNER: ...]`.
- Tests that pinned the old "unknown" state (the "wording pending" placeholders, "E3 to E7") were changed on purpose, with reasons in their comments.

### Fixed
- The Attributions page did not list eventemitter3, a runtime dependency of Phaser; it is now listed with its licence, and the licence test reads the lockfile so the list cannot drift.
- README said "about 5 minutes" while the title screen says "About 10 minutes".

## [1.0.0] - 2026-11-11

First complete release. The features are frozen; Phases 6 to 8 only fixed, documented, packaged and gated.

### Added
- **Game loop:** Title, Mission Brief, Design Bay, Launch, Mission Control, Outcome, Rewind, Outcome diff.
- **Consequence Threads:** coloured lines from a choice to the meters it moves, each with an icon, a line pattern and a colour, plus a spoken sentence for screen readers.
- **Mission Control:** data storage and a downlink, a seeded solar storm, one in-flight decision with three answers (none recommended).
- **Scoring:** four scores (science, data return, spacecraft health, budget margin) and five tiers, defined in `docs/tiers.md`.
- **Rewind and cause chains:** every outcome is traced to the player's own decisions; Rewind keeps the seed so the comparison is fair.
- **Four mission variants:** Standard, Early storm, Tight budget, Data-rich target (content only).
- **Learnability:** guided first run, a 90-second Demo Mode (`?demo=1`), six Science Cards with sources, saved progress.
- **Accessibility:** high-contrast theme, three text sizes, keyboard operation throughout, reduced-motion support.
- **Sharing:** share links (design, seed, variant, storm answer) treated as untrusted input; Copy summary.
- **Deploy:** static build, GitHub Pages workflow, 404 fallback, no source maps in production, Attributions page.
- **Release tooling:** `npm run audit:all` (unit tests plus every browser audit), `npm run package:offline` (a zip that runs with no internet), `npm run screenshots` (repeatable 1280x720 submission images).
- **Docs:** README (pitch, how to play, honest limitations), demo script, video script, how-it-works, judge review, cross-browser steps, offline guide, submission draft, Truth Ledger.

### Fixed (Phases 6 and 7)
- The storm decision took about three phone screens (1,836 px tall at 390 px wide, the three Choose buttons 1,044 px apart). The three Choose buttons are now one row that sticks to the bottom of a phone screen while the decision is on screen, the 15% radiation chance is stated once instead of in every card, and each card's Risks row names the instruments it leaves exposed. Every card still shows its own cost, risk, power row and model labels.
- The Brief now spells out "Mb" as megabits where players first meet it.
- On phones the "Unverified placeholder" badge on the Fuel margin meter was visually hidden; it is visible again.
- The Truth Ledger's Moon gravitational-parameter row had been overwritten by an unrelated line; it is restored and a test now ties the ledger's NASA values to the game's data file.
- Generated folders (the offline package, logs) no longer make the linter report thousands of false errors.

### Verified
- Licences of the two shipped libraries are MIT (read from the installed packages; a test re-reads them).
- No font is bundled or loaded.
- The shipped dependencies have no known vulnerabilities (`npm audit --omit=dev`). The lint toolchain has moderate advisories (10 affected packages when re-counted on 2026-11-11) that are not shipped (see `KNOWN_ISSUES.md`).
- Chromium only. Firefox and Safari were not run (see `docs/cross-browser.md`).
