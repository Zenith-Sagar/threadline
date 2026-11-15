# Official demo: 30-second video script (and the 7-slide deck)

**This is the demo the event accepts.** Source: *Project Submission Guide*, 13 Nov 2026, "Tips for Creating a Project Demo": a video of **30 seconds or less**, or a slide deck of **no more than seven slides including the title slide**. "Projects that exceed these limits will not be eligible for Global Judging." The form has **one** demo link, so submit **one** of the two:

| Option | Files | Notes |
|---|---|---|
| **Slide deck (recommended)** | `docs/demo/threadline-demo-7slides.pdf` (and the editable `.pptx`) | No voice and no face on screen, so the under-18 rule cannot be broken by accident. Slide 7 holds the live link: rebuild with `LIVE_URL=... node scripts/build-demo-deck.mjs` (see the header of that script) or edit the text in the `.pptx` and re-export the PDF. |
| **30-second video** | this script and `docs/demo/demo-30s.srt` | Record it yourself. The speaker must not be under 18 (guide: no image, video, audio or likeness of anyone under 18). |

Language: English. A video in another language must carry English subtitles (the SRT is English).

## Voice-over (timeline from the guide: 0:00 introduce, 0:02 challenge, 0:05 title and tagline, 0:10 how it works and NASA data, 0:20 to 0:30 the future)

Pace rule: no row above 2.7 spoken words per second, and no more than 75 spoken words in all (checked by `tests/docs/demo.test.ts`). This script is **58 words** in all.

| Time | Picture | Voice-over |
|---|---|---|
| 0:00-0:02 | Title screen, held | "I'm Sagar, from team Threadline." |
| 0:02-0:05 | Same shot | "Our challenge: Space Mission Design Game." |
| 0:05-0:10 | Same shot | "Threadline. Every choice leaves a trace." |
| 0:10-0:20 | Design Bay with threads, then the outcome and its cause chain | "Design a Moon orbiter, survive a solar storm, trace the result to your choice. NASA's Moon Fact Sheet sets the orbit." |
| 0:20-0:30 | Back to the title screen with the address on it | "Next: sourced numbers and more missions. You do not read about trade-offs. You feel them. Play it in your browser." |

Why these words and no others: the Moon Fact Sheet claim is the one NASA-data claim the game makes (radius and gravitational parameter give the orbit; see `docs/truth-ledger.md`, D1, D2, C1). "Sourced numbers and more missions" is the project's own "what's next" list (README, KNOWN_ISSUES). Nothing says who had the idea or how the game was written: that belongs in the submission form's SI field, in the owner's words.

*Optional, only if the owner wants it:* the guide's 0:02 beat also suggests "what inspired you". That is the owner's to say; it is not written here, and adding words would break the 75-word and pace limits.

## Captions

`docs/demo/demo-30s.srt`: English, 10 cues, ends at 29.5 s, at most two lines of 42 characters, 20 characters per second at most. Each cue sits inside one row above and the cues in a row spell out its voice-over word for word (tested).

## Shot list (matches the game and `?demo=1`)

Seed **29** everywhere, so the take is repeatable. `/?demo=1` opens the Design Bay with the design already built and a **Demo** badge; the title screen button **Try the 90-second demo** does the same. Numbers on screen are what this version of the game shows.

| # | Video time | Start from | Clicks (in order) | What must be on screen |
|---|---|---|---|---|
| 1 | 0:00-0:10 | Fresh browser profile, open `/?seed=29` | none (hold) | "Threadline", "Every choice leaves a trace.", **Start mission**, **Try the 90-second demo** |
| 2 | 0:10-0:20 | Shot 1 | Press **Try the 90-second demo** (or open `/?demo=1` instead); untick **Thermal infrared radiometer**, wait 2 s, tick it again; press **Skip to the outcome** | Threads drawing to the meters; then "Recovered: the mission got through a crisis", four scores and the cause chain |
| 3 | 0:20-0:30 | Shot 2 | Press **Exit the demo** | The title screen. Add the live address as a text overlay in editing |

**Visible SI marking (required).** Burn "Built with SI assistance (Claude, Anthropic)" into the lower part of every frame, for the whole video (guide, "Use of Super Intelligence": images and videos must carry a visible watermark to indicate SI generation). Put the same sentence in the video's description text.

**Record:** 1280 x 720, browser zoom 100%, a fresh profile (or **Reset progress** twice), reduced motion off, no bookmarks, tabs or private details on screen. Export at 30 s or less and check the length on the exported file, not on the timeline.

**Do not claim:** NASA endorsement; that it is a simulator or accurate; testing in Firefox, Safari, phones or with real players; any number that is not on screen. Do not use NASA logos or branding (the guide forbids it in generated content).

## Rebuild the deck

```
python3 scripts/watermark-screenshots.py          # SI-marked copies of the five screenshots
NODE_PATH=$(npm root -g) LIVE_URL="https://<user>.github.io/threadline/" node scripts/build-demo-deck.mjs
soffice --headless --convert-to pdf --outdir docs/demo docs/demo/threadline-demo-7slides.pptx
```

Deck rules, all tested: exactly 7 slides; at most 30 words of content per slide (the footer lives on the slide layout and is not counted); the footer "Built with SI assistance (Claude, Anthropic)" on every slide; team name, member (Sagar only: the AI is not a team member) and the challenge on slide 1; a real screenshot on slides 1, 3 and 4; the three Moon Fact Sheet values on slide 5; the three model labels on slide 6.
