# Shot list (matches the 2-minute walkthrough script and Demo Mode)

> **Optional long walkthrough, NOT the official demo (limit 30 s).** The Space Apps Project Submission Guide (13 Nov 2026) accepts a demo video of 30 seconds or less, or a deck of at most 7 slides; over either limit is not eligible for Global Judging. The official demo is in `docs/demo/` (`demo-30s.md`, the 7-slide deck). Keep this shot list for your own site, a longer upload or a judging-table walkthrough, and never put it in the "Link to Project Demo" field.

Seed **29** everywhere, so every take shows the same mission. Numbers below are what this version shows (they come from the game, not from the script). Re-run the take if the game changes: `npm run screenshots` replays five of these shots as a quick check (shots 1, 3, 5, 6 and 7: the title, the Design Bay, the storm decision, the outcome with its cause chain, and the Rewind diff). It does not cover shots 2, 4 or 8.

**Two ways to get the Design Bay.** *Option A (fast):* open `/?demo=1`; the design is pre-built and a **Demo** badge shows on every screen, which is honest and fine. *Option B (no badge):* build it by hand, which is exactly what `npm run screenshots` does: tick **Imaging camera**, **Spectrometer**, **Thermal infrared radiometer**; choose **Medium launcher**; set **Solar array** to 320; press **Auto-size fuel**. Battery stays at 150 and storage at its default. Use one option for the whole video.

| # | Video time | Start from | Clicks (in order) | What must be on screen | Voice-over starts |
|---|---|---|---|---|---|
| 1 | 0:00-0:10 | Fresh browser profile, open `/?seed=29` | none (hold) | Title: "Threadline", "Every choice leaves a trace", **Start mission** and **Try the 90-second demo** | "Space missions are chains of trade-offs." |
| 2 | 0:10-0:25 | Shot 1 | **Start mission**; slowly move over the four mission variants; leave **Standard mission** selected | The Brief: variants with "Changes: ..." lines, constraints, the NASA DATA and GAME MODEL labels | "You are Mission Director..." |
| 3 | 0:25-0:50 | Shot 2 | **Open the Design Bay** (press **Skip the guide** if the guide shows); build the design (Option B) or use `?demo=1` (Option A); untick **Thermal infrared radiometer**, wait 2 s, tick it again | Threads drawing from the card to the meters, each with an icon and a line pattern; then zoom on the legend | "Every choice draws a thread..." |
| 4 | 0:50-1:05 | Shot 3 | **Launch**; let the animation play about 8 s; then **Skip launch** | The launch scene, then Mission Control with orbits ticking | "Launch." |
| 5 | 1:05-1:25 | Shot 4 | **Skip to the storm decision**; pause on the three answers; **Choose: Switch off the Spectrometer** | "Solar storm warning: orbit 5"; three cards with Costs, Risks and Power; the line "There is no recommended answer" | "A solar storm arrives." |
| 6 | 1:25-1:45 | Shot 5 | **Skip to the end**, then **See the outcome**; wait 2 s for the reveal; scroll to the first cause chain; press **Why did this happen?** and show a Science Card with its sources; press Esc | "Recovered: the mission got through a crisis"; four scores (about 79%, 78%, 88%, 100%); the cause chain; a card with sources | "The outcome traces back to your choices." |
| 7 | 1:45-1:55 | Shot 6 | **Change one decision**; set **Battery** to 300; **Auto-size fuel**; **Run the mission again**; then back on the outcome of a new run press **Copy link** (or show the "Link copied" line) | "Compared with your last flight", "Same seed (29)", the changed rows; then the Copy link button | "Rewind: same seed, same luck..." |
| 8 | 1:55-2:00 | Anywhere | none | Title card or the title screen with the address | "Try it." |

Notes
- Shot 7 needs a finished outcome first. If the Copy link button is not on screen after the diff, go back with **See why this flight went this way**.
- The diff for Battery 300 reads Recovered to Recovered with a lower budget margin. That is true and is the point: the decision that saved the mission was the storm answer.
- Do not edit the speed of the launch animation. If it is too long, use **Skip launch**.
