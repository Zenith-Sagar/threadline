# Running the game with no internet (judging-table fallback)

**What you need:** a computer with a web browser and either **Node.js** or **Python 3**. Nothing to install, no internet, no account.

## Make the package (on a computer that has the project)

```
npm install
npm run package:offline
```

This writes `release/threadline-offline.zip` (a few hundred KB). Copy that one file to a USB stick.

## Run it (at the judging table)

1. Unzip `threadline-offline.zip`. You get a folder `threadline-offline` with `app/`, `serve.mjs` and `START-HERE.txt`.
2. Open a terminal in that folder and run **one** of:
   - `node serve.mjs`
   - `python3 -m http.server 8080 -d app` (on Windows use `python`)
3. Open **http://127.0.0.1:8080/** in the browser. For the 90-second demo open **http://127.0.0.1:8080/?demo=1**.

If port 8080 is busy, `node serve.mjs` picks the next free port and prints the address; with Python choose another number.

## What works with no internet

Everything in the game: the demo, all four variants, the launch animation, Mission Control, the outcome, Rewind, saved progress, share links, and the Science Cards (text and source list).

## What needs the internet

Only the links that open the original source pages. They are plain links.

## What does not work

Double-clicking `app/index.html`. Browsers refuse to load the game's scripts from a file on disk (`file://`), so the page would stay blank. Use one of the two commands.

## How this was verified

`npm run audit:all` unzips the package into a fresh folder with no `node_modules`, starts `serve.mjs`, and runs `scripts/browser-audit-offline.py` in Chromium with **every request outside the local server blocked and counted**: the game loads, the launch animation file loads and draws, the demo reaches Recovered, zero outside requests were attempted, zero local requests failed, no console errors, the Attributions page shows both licences, an unknown address answers 404 and still shows the game, and path-traversal requests are refused (11 checks). Python's built-in server was checked by hand (it serves the same files). Browsers other than Chromium were not tried (`docs/cross-browser.md`).
