// Plain-language definitions shown in tooltips. Jargon never appears without one of these.
export const GLOSSARY = {
  eclipse:
    'The part of each orbit when the Moon blocks the Sun. The solar array makes no power then, so the battery has to run everything.',
  'safe mode':
    'In this game, when the battery runs out the spacecraft switches off its instruments and recharges. The science for that orbit is lost.',
  'fuel margin':
    'Extra fuel beyond what the mission needs. A small margin leaves no room for surprises.',
  launcher:
    'The rocket that lifts your spacecraft off Earth. Bigger launchers lift more, fail less often, and cost more.',
  'delta-v':
    'How much your spacecraft can change its speed using its fuel. Every manoeuvre needs some. Also called delta-v.',
  'engine efficiency':
    'How much push each kilogram of fuel gives. Engineers call it specific impulse (Isp). This game uses a placeholder value.',
  'usable battery':
    'In this game only part of the battery can be used, so it is never drained completely. This is a game rule.',
  seed:
    'A number that fixes the luck in a mission. Rewinding keeps the same seed, so only your choices change the result.',
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
