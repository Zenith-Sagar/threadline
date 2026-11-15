# 90-second Demo script (click by click)

Matches Demo Mode exactly. Every result is real: the demo only pre-sets the seed (29) and the design, then runs the normal `simulate()`. A test (`tests/core/demo.test.ts`) fails if a content change ever stops the demo from ending in **Recovered**.

**Open:** the deployed link with `?demo=1` at the end, or press **Try the 90-second demo** on the title screen. A **Demo** badge shows on every screen. **Skip to the outcome** and **Exit the demo** are always in the strip under the title.

Numbers below are what the game showed when this script was written (seed 29, this version). Run the demo once before presenting.

| Time | You click | On screen | You say |
|---|---|---|---|
| 0:00 | (page opens on the **Design Bay**) | Three instruments already ticked: Imaging camera, Spectrometer, Thermal infrared radiometer. Medium launcher. Meters and threads. | "Space missions are chains of trade-offs. This spacecraft is already built. Each coloured thread links a choice to the meters it moves." |
| 0:15 | Untick **Thermal infrared radiometer**, then tick it again (optional) | A thread draws to Weight, Power, Cost, Data and Science. Each also has an icon and a line pattern. The design is back as it was. | "Colour is never the only signal: every thread has an icon and a pattern, and each change is also described in words." |
| 0:25 | **Launch** | Launch animation (about 10 s). | "A storm is coming, and this design cannot ride it out." |
| 0:30 | **Skip launch** | **Mission Control**: orbits tick by, battery, data storage and science meters. | "Orbits tick by. Storage and the battery fill and drain." |
| 0:40 | **Skip to the storm decision** | **Solar storm warning: orbit 5**, three answers, each with its cost and its risk. "There is no recommended answer." | "Now the one in-flight decision. Ride it out, switch off the biggest power user, or enter safe mode early. None is marked as best. The best one depends on the design." |
| 0:55 | **Choose: Switch off the Spectrometer** | Orbits continue. | "I switch off the spectrometer for the storm." |
| 1:00 | **Skip to the end**, then **See the outcome** | **Recovered: the mission got through a crisis.** Science 79%, data 78%, health 88%, budget margin 100%. | "Recovered means a storm hit, I answered it, and riding it out on the same seed would have ended worse." |
| 1:10 | (read the first cause chain) | "Your choice: Switch off the Spectrometer, then 15% risk per instrument on each storm orbit, then Thermal infrared radiometer damaged on orbit 7, then lost for the rest of the mission." | "Every outcome traces back to a decision. Even the damage is explained." |
| 1:20 | **Change one decision**, set **Battery** to 300, **Auto-size fuel**, **Run the mission again** | **Compared with your last flight.** Same seed (29). Outcome: Recovered to Recovered. Budget margin 100% to 94%. | "Rewind: same seed, same luck, only my decision changed. A bigger battery bought nothing here and cost six points of budget margin. The storm answer did the saving." |
| 1:30 | **Exit the demo** (or **Copy link**) | Back to the title (or the link is copied). | "Share the link and a friend can try to beat it." |

**If something looks different:** the storm orbit and the numbers come from the seed and the content. If you changed content, re-run the demo and update this table, or run `npm test` (the demo guard will tell you).

**Fallback if the network is down:** the game needs no network after it loads. If the hosted page is unavailable, run `npm run build && npm run preview` and open `http://localhost:4173/?demo=1`.
