// Plain-text description of what one design change did to the meters, for screen-reader users
// (the Consequence Threads are drawn lines, so every thread also gets a sentence).
// Pure: takes two previews, returns a string such as
//   "Radar sounder: adds 38 W to Power, 22 kg to Weight, $50M to Cost."
import type { Preview } from '@/sim';

interface Part { adds: boolean; text: string }

const r1 = (n: number): string => String(Math.round(n * 10) / 10);

function dataPerOrbit(p: Preview): number {
  return p.instruments.reduce((s, i) => s + i.dataMbPerOrbit, 0);
}

export function describeChange(label: string, before: Preview, after: Preview): string {
  const b = before.metrics;
  const a = after.metrics;
  if (!b || !a) return `${label}: the design changed.`;
  const parts: Part[] = [];
  const push = (delta: number, min: number, amount: (n: number) => string, meter: string): void => {
    if (Math.abs(delta) < min) return;
    parts.push({ adds: delta > 0, text: `${amount(Math.abs(delta))} ${delta > 0 ? 'to' : 'from'} ${meter}` });
  };
  push(a.wetKg - b.wetKg, 0.5, (n) => `${r1(n)} kg`, 'Weight');
  // Power: the load in watts when instruments change, otherwise the battery reserve.
  const loadDelta = a.loadW - b.loadW;
  if (Math.abs(loadDelta) >= 0.5) push(loadDelta, 0.5, (n) => `${r1(n)} W of load`, 'Power');
  else push((after.minReserveFrac - before.minReserveFrac) * 100, 1, (n) => `${r1(n)} points of battery reserve`, 'Power');
  push(a.totalCostM - b.totalCostM, 0.05, (n) => `$${r1(n)}M`, 'Cost');
  const dataDelta = dataPerOrbit(after) - dataPerOrbit(before);
  if (Math.abs(dataDelta) >= 0.5) push(dataDelta, 0.5, (n) => `${r1(n)} Mb per orbit`, 'Data');
  else push(after.storageMb - before.storageMb, 1, (n) => `${r1(n)} Mb of storage`, 'Data');
  push((a.dvMarginFrac - b.dvMarginFrac) * 100, 0.5, (n) => `${r1(n)} points of margin`, 'Fuel');
  push(after.sciencePerOrbit - before.sciencePerOrbit, 0.5, (n) => `${r1(n)} points per orbit`, 'Science');

  if (parts.length === 0) return `${label}: no meter changed.`;
  const adds = parts.filter((p) => p.adds).map((p) => p.text);
  const removes = parts.filter((p) => !p.adds).map((p) => p.text);
  const sentence = [adds.length ? `adds ${adds.join(', ')}` : '', removes.length ? `removes ${removes.join(', ')}` : '']
    .filter(Boolean)
    .join('; ');
  return `${label}: ${sentence}.`;
}
