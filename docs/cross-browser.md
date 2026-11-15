# Cross-browser and robustness (Phase 6, slice C)

## What was automated, and where

| Browser | Status |
|---|---|
| **Chromium** (Playwright) | All audits pass: `npm run audit:all`. |
| **Firefox** | **Not run.** Playwright could not download Firefox in the build environment (the browser download host is blocked), and no system Firefox exists. Manual steps below. |
| **WebKit / Safari** | **Not run.** Same reason. Manual steps below. |

Do not claim Firefox or Safari support in the submission until someone has done the manual steps.

## Faults injected on purpose in Chromium (all pass, `scripts/browser-audit-phase6.py`)

| Fault | What the game does | Checked |
|---|---|---|
| Storage blocked (every `localStorage` access throws) | Plays normally; the title and footer say "This browser blocks saving, so progress lasts only for this visit"; display settings work for the visit | loop ends Recovered; note shown; high contrast works; no error |
| Clipboard missing or refused | Shows the link in a selectable box for manual copying | box visible with the link; no error |
| Launch animation file throws when loaded | The text launch takes over; the game continues | no canvas; words on screen; reaches Recovered |
| Launch animation file answers 404 | Same | same |
| Launch animation file throws when it starts | Same | same |
| Slow network (file held back) | Shows "Preparing the launch..."; Skip works at once; a late file does not pull the player back or draw over the page | reaches Mission Control; stays there after the file is released |
| Slow network, patient player | The animation plays when the file arrives | canvas appears |
| Offline after the page loaded | Text launch; the whole loop works; sharing works (it needs no network) | reaches Recovered |
| Window resized during the launch (390, 820, 1280, 600 px wide) | No sideways scroll, canvas never wider than the window, Skip still works | measured at each size |

No application bug was found by these tests: the fallbacks that were already there held.

## Manual steps for Firefox and Safari (about 15 minutes each)

Use the deployed link, or the offline package (`docs/offline.md`). Use the latest stable Firefox on desktop, and Safari on a Mac and, if possible, on an iPhone or iPad.

1. **Load.** Open the game. The title appears with no error message. Open the browser's developer console (Firefox: F12, Console; Safari: Develop menu, Show JavaScript Console). It should show no red errors.
2. **Demo.** Open `?demo=1`. Press **Skip to the outcome**. It must read **Recovered**.
3. **Launch animation.** Go back, press **Try the 90-second demo** again, then **Launch**. A rocket scene should draw on a canvas for about 10 seconds. If it shows only text, note which browser; that is the designed fallback, but it means the animation does not work there. Press **Skip launch**.
4. **Threads.** In the Design Bay, untick and re-tick **Thermal infrared radiometer**. Coloured lines should draw from the card to the meters, each with an icon and a line pattern.
5. **Mission Control.** Press **Skip to the storm decision**. Three answers appear. Choose **Switch off the Spectrometer**, **Skip to the end**, **See the outcome**.
6. **Rewind.** Press **Change one decision**, set **Battery** to 300, press **Auto-size fuel**, then **Run the mission again**. The page reads "Compared with your last flight".
7. **Share.** On an outcome press **Copy link**, paste it in a new tab. The Design Bay opens with a "Try to beat this" banner. If copying fails for any reason, the link must appear in a box.
8. **Settings.** Tick **High contrast**, press **Larger**. Reload. Both should persist. Press **Reset progress** twice.
9. **Keyboard only.** Press Tab from the top of the page. Every button must show a visible outline. You should be able to finish steps 2 to 6 without a mouse.
10. **Narrow window.** Make the window about 390 px wide (or use a phone). No sideways scroll on any screen.
11. **Private window.** Repeat step 2 in a private window. The game must work; it may say that saving is blocked.
12. **Science Card.** At the footer open **Science Cards**, press a card. A dialog opens; Esc closes it and focus returns to the button.

Record, for each step: pass, fail, or "different but fine", with the browser and version. Put any failure in `KNOWN_ISSUES.md`.

## Where to look first in other browsers

These are the features the game depends on. They were NOT checked outside Chromium, so any of them could behave differently:

- WebGL through Phaser for the launch animation (without it, the designed fallback is the text launch; that fallback was tested by injecting a failure).
- The `<dialog>` element (Science Cards) and `color-mix()` in the stylesheet.
- `crypto.getRandomValues` (random seed) and `navigator.clipboard` (Copy link).
- The sticky meter panel on narrow screens.
