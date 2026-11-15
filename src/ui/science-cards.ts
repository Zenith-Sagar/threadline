// Science Cards: six short explainers (80 words at most each) with their sources.
//
// Rules for this file:
//   - No real-world number appears in any card (tests reject digits). Numbers live in the Truth Ledger with a source.
//   - Every real-world statement is a paraphrase of a source listed on the same card, read on the date shown.
//   - Whatever the game simplifies or invents is said plainly, and anything not sourced goes in `unverified`.
export type CardId = 'delta-v' | 'eclipse-batteries' | 'solar-panels' | 'downlink' | 'storms' | 'failures';

export interface CardSource {
  title: string;
  publisher: string;
  url: string;
  /** Date the page was read (YYYY-MM-DD). */
  retrieved: string;
}

export interface ScienceCard {
  id: CardId;
  title: string;
  /** At most 80 words. */
  body: string;
  sources: CardSource[];
  /** Statements on this card that could not be sourced. Shown in the footer and listed in docs/truth-ledger.md. */
  unverified: string[];
}

const D = '2026-10-16';

const SPINOFF: CardSource = {
  title: 'Control Algorithms Charge Batteries Faster (NASA Spinoff 2011)',
  publisher: 'NASA Glenn Research Center',
  url: 'https://ntrs.nasa.gov/api/citations/20120001911/downloads/20120001911.pdf',
  retrieved: D,
};

export const SCIENCE_CARDS: readonly ScienceCard[] = [
  {
    id: 'delta-v',
    title: 'Why fuel and weight matter',
    body:
      'A rocket must carry all the propellant it has not used yet, so extra weight needs extra fuel, and that fuel needs still more. ' +
      'The rocket equation links the speed change a spacecraft can make to its propellant, structure and payload masses. ' +
      'A NASA engineer calls weight and size big drivers of space design. ' +
      'In the game, fuel margin shows how much speed change you have beyond what the mission needs.',
    sources: [
      { title: 'Learn the rocket equation, part 1', publisher: 'The Planetary Society', url: 'https://www.planetary.org/blogs/guest-blogs/2017/20170428-the-rocket-equation-part-1.html', retrieved: D },
      SPINOFF,
    ],
    unverified: ["The game's burn budgets and engine efficiency are placeholders (ledger P1 to P4)."],
  },
  {
    id: 'eclipse-batteries',
    title: 'Eclipse, batteries and safe mode',
    body:
      'A NASA power engineer put it plainly: if you have solar arrays and you are in orbit, at some point you will be in eclipse. ' +
      'So spacecraft pair arrays with a battery: the arrays power the craft and charge the battery, and the battery takes over in shadow. ' +
      'A spacecraft can also switch itself into a protective state when it detects a problem. ' +
      'In the game, an empty battery sends yours into safe mode and that orbit\u2019s science is lost.',
    sources: [
      SPINOFF,
      { title: 'MAVEN Status Update: Nov. 20, 2014', publisher: 'LASP, University of Colorado (NASA MAVEN mission)', url: 'https://lasp.colorado.edu/maven/2014/11/20/maven-status-update-nov-20-2014/', retrieved: D },
    ],
    unverified: [],
  },
  {
    id: 'solar-panels',
    title: 'Solar panels and arrays',
    body:
      'Small spacecraft commonly make power with a standard recipe: solar cells form panels, and panels form arrays. ' +
      'NASA notes that a solar panel\u2019s output depends on how much light it gets and on other conditions around it. ' +
      'A bigger array makes more power but adds weight and cost. ' +
      'In the game, the array makes full power in sunlight and only about half during the solar storm, and the battery covers the gap.',
    sources: [
      SPINOFF,
      { title: 'State-of-the-Art Small Spacecraft Technology: Power', publisher: 'NASA Small Spacecraft Systems Virtual Institute', url: 'https://www.nasa.gov/wp-content/uploads/2023/05/3.-soa-power-2022.pdf', retrieved: D },
    ],
    unverified: ['The storm halving the array is a game rule, not a measured effect.'],
  },
  {
    id: 'downlink',
    title: 'Sending data home',
    body:
      'Spacecraft send their data to Earth as radio signals, and radio waves travel at the speed of light. ' +
      'NASA\u2019s educator guide notes that a signal to the Moon takes only a little over a second. ' +
      'In the game, instruments fill onboard storage and the radio link sends a fixed amount each orbit. If storage fills, the instruments pause. ' +
      'The signal delay is shown for information only.',
    sources: [
      { title: 'Earth Calling (NASA educator guide)', publisher: 'NASA', url: 'https://www.nasa.gov/wp-content/uploads/2011/08/583093main_earth_calling.pdf', retrieved: D },
    ],
    unverified: ['The game\u2019s link rate and storage costs are game-scaled, not real figures.'],
  },
  {
    id: 'storms',
    title: 'Solar storms and radiation',
    body:
      'NASA Goddard describes how energetic particles from solar events can cause temporary glitches, damage critical electronics and degrade solar arrays. ' +
      'Operators sometimes put a spacecraft into safe mode on purpose to protect its electronics through a storm. ' +
      'In the game, a storm weakens your array and gives every running instrument a chance of permanent damage on each storm orbit. A switched-off instrument cannot be hit. This is a game model, not a forecast.',
    sources: [
      { title: 'How Do Space Weather Effects & Solar Storms Affect Earth?', publisher: 'NASA Goddard Scientific Visualization Studio', url: 'https://svs.gsfc.nasa.gov/31248', retrieved: D },
      { title: 'How does solar variability affect human society, technological systems and the habitability of planets?', publisher: 'NASA Science', url: 'https://science.nasa.gov/heliophysics/science-questions/how-does-solar-variability-affect-human-society-technological-systems-and-the-habitability-of-planets', retrieved: D },
      { title: 'How \u2018safe mode\u2019 protects space telescopes like Hubble and TESS', publisher: 'Popular Science', url: 'https://www.popsci.com/science/safe-mode-space-telescope/', retrieved: D },
    ],
    unverified: ['The damage chance and storm length are game numbers.'],
  },
  {
    id: 'failures',
    title: 'Why failures are studied',
    body:
      'NASA\u2019s main way to collect and share lessons from its programs and missions is its Lessons Learned Information System. ' +
      'A government review described its goal as avoiding having to relearn past lessons, and also found that lessons were not always collected or shared well. ' +
      'A lesson only helps if it gets passed on. ' +
      'In the game, the cause chain is your lessons-learned record: change one decision and compare.',
    sources: [
      { title: 'Survey of NASA\u2019s Lessons Learned Process (GAO-01-1015R)', publisher: 'U.S. Government Accountability Office', url: 'https://www.gao.gov/products/gao-01-1015r', retrieved: D },
    ],
    unverified: ['The GAO review is from 2001; NASA\u2019s current process may differ.'],
  },
];

export const cardById = (id: CardId): ScienceCard => SCIENCE_CARDS.find((c) => c.id === id) ?? (SCIENCE_CARDS[0] as ScienceCard);

/** Glossary term -> the card that explains it. */
export const CARD_FOR_TERM: Record<string, CardId> = {
  eclipse: 'eclipse-batteries',
  'safe mode': 'eclipse-batteries',
  'usable battery': 'eclipse-batteries',
  'delta-v': 'delta-v',
  'fuel margin': 'delta-v',
  'engine efficiency': 'delta-v',
};

/** Cause-chain id -> the card behind "Why did this happen?". */
export function cardForChain(chainId: string): CardId {
  if (chainId.startsWith('launch')) return 'failures';
  if (chainId.startsWith('storage')) return 'downlink';
  if (chainId.includes('radiation') || chainId.includes('storm') || chainId.includes('response')) return 'storms';
  return 'eclipse-batteries';
}

export const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
