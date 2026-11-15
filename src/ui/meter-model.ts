// Pure view-model for the Design Bay's live bars and the Engineering Detail drawer.
// No DOM here, so it is unit-tested in a plain Node environment.
import type { Design, MissionDef } from '@/data/schemas/types';
import { lightTimeS, maxSciencePerOrbit, type Preview } from '@/sim';
import type { GlossaryKey } from './glossary';
import type { LabelKind } from './labels';
import type { Meter } from './tokens';

export type Status = 'ok' | 'tight' | 'bad' | 'idle';

export interface MeterView {
  id: Meter;
  name: string;
  /** Fill, 0..1 */
  frac: number;
  /** Optional marker position, 0..1 (for example "fuel needed"). */
  markFrac: number | null;
  status: Status;
  statusText: string;
  /** Plain-language one-liner under the bar. */
  text: string;
  /** Text for assistive technology (aria-valuetext). */
  valueText: string;
  /** Changes whenever what the player sees changes (drives Consequence Threads). */
  sig: string;
  labels: LabelKind[];
}

export const METER_ORDER: Meter[] = ['mass', 'power', 'data', 'fuel', 'cost', 'science'];

const r = (n: number): number => Math.round(n);
const clamp01 = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

const STATUS_TEXT: Record<Status, string> = { ok: 'OK', tight: 'Tight', bad: 'Problem', idle: 'Waiting' };

export function view(
  id: Meter, name: string, labels: LabelKind[],
  p: { frac: number; markFrac?: number; status: Status; statusText?: string; text: string },
): MeterView {
  const statusText = p.statusText ?? STATUS_TEXT[p.status];
  return {
    id, name, labels, frac: clamp01(p.frac), markFrac: p.markFrac ?? null,
    status: p.status, statusText, text: p.text,
    valueText: `${statusText}. ${p.text}`,
    sig: `${p.status}|${Math.round(clamp01(p.frac) * 100)}|${p.text}`,
  };
}

const idle = (id: Meter, name: string, labels: LabelKind[], text: string): MeterView =>
  view(id, name, labels, { frac: 0, status: 'idle', text });

export function computeMeters(preview: Preview, mission: MissionDef): MeterView[] {
  const { metrics, vehicle } = preview;
  const orbits = preview.orbits;

  const mass: MeterView =
    metrics && vehicle
      ? (() => {
          const ratio = metrics.wetKg / vehicle.capacityKg;
          const status: Status = ratio > 1 ? 'bad' : ratio > 0.95 ? 'tight' : 'ok';
          return view('mass', 'Weight at launch', ['GAME MODEL'], {
            frac: ratio, status,
            statusText: status === 'bad' ? 'Too heavy' : undefined,
            text: `${r(metrics.wetKg)} kg of the ${r(vehicle.capacityKg)} kg this launcher can lift`,
          });
        })()
      : idle('mass', 'Weight at launch', ['GAME MODEL'], 'Waiting for a valid design');

  const power: MeterView = metrics
    ? (() => {
        const first = preview.brownoutOrbits[0];
        if (first !== undefined) {
          const more = preview.brownoutOrbits.length - 1;
          return view('power', 'Power in eclipse', ['SIMPLIFIED PHYSICS'], {
            frac: 0, status: 'bad', statusText: 'Safe mode',
            text: `Runs out on orbit ${first}${more > 0 ? ` and ${more} more` : ''}. Instruments switch off.`,
          });
        }
        const left = Math.round(preview.minReserveFrac * 100);
        const tight = preview.minReserveFrac < 0.15;
        return view('power', 'Power in eclipse', ['SIMPLIFIED PHYSICS'], {
          frac: preview.minReserveFrac, status: tight ? 'tight' : 'ok',
          text: `Stays powered through all ${orbits} orbits. ${left}% battery left after the longest eclipse.`,
        });
      })()
    : idle('power', 'Power in eclipse', ['SIMPLIFIED PHYSICS'], 'Waiting for a valid design');

  const fuelLabels: LabelKind[] = ['SIMPLIFIED PHYSICS', 'UNVERIFIED PLACEHOLDER'];
  const fuel: MeterView = metrics
    ? (() => {
        const margin = metrics.dvMarginFrac;
        const status: Status = margin < 0 ? 'bad' : margin < 0.1 ? 'tight' : 'ok';
        const sign = margin >= 0 ? '+' : '-';
        return view('fuel', 'Fuel margin', fuelLabels, {
          frac: metrics.dvAvailableMps / (metrics.dvRequiredMps * 1.5),
          markFrac: 1 / 1.5,
          status,
          statusText: status === 'bad' ? 'Not enough' : status === 'tight' ? 'Thin' : 'OK',
          text: `${sign}${Math.abs(r(margin * 100))}% more than the mission needs`,
        });
      })()
    : idle('fuel', 'Fuel margin', fuelLabels, 'Waiting for a valid design');

  const cost: MeterView = metrics
    ? (() => {
        const ratio = metrics.totalCostM / mission.rules.budgetM;
        const status: Status = ratio > 1 ? 'bad' : ratio > 0.95 ? 'tight' : 'ok';
        return view('cost', 'Cost', ['GAME MODEL'], {
          frac: ratio, status,
          statusText: status === 'bad' ? 'Over budget' : undefined,
          text: `$${r(metrics.totalCostM)}M of the $${r(mission.rules.budgetM)}M budget`,
        });
      })()
    : idle('cost', 'Cost', ['GAME MODEL'], 'Waiting for a valid design');

  const maxPerOrbit = maxSciencePerOrbit(mission);
  const have = preview.instruments.length;
  const need = mission.rules.instrumentCount;
  const scienceFrac = maxPerOrbit > 0 ? preview.realizedScience / (maxPerOrbit * orbits) : 0;
  const science: MeterView =
    have < need
      ? view('science', 'Science collected', ['GAME MODEL'], {
          frac: scienceFrac, status: 'idle', statusText: `Pick ${need - have} more`,
          text: `${have} of ${need} instruments chosen`,
        })
      : (() => {
          const f = preview.scienceFrac;
          const status: Status = f >= 0.99 ? 'ok' : f >= 0.7 ? 'tight' : 'bad';
          return view('science', 'Science collected', ['GAME MODEL'], {
            frac: scienceFrac, status,
            statusText: status === 'ok' ? 'OK' : status === 'tight' ? 'Reduced' : 'Low',
            text: `${r(preview.realizedScience)} points, ${r(f * 100)}% of what these instruments could collect`,
          });
        })();

  // Data and storage (Phase 3). GAME MODEL numbers: what the instruments make, what the link sends, what storage holds.
  const perOrbit = preview.instruments.reduce((s, i) => s + i.dataMbPerOrbit, 0);
  const link = mission.bus.downlinkMbPerOrbit;
  const data: MeterView = !metrics
    ? idle('data', 'Data and storage', ['GAME MODEL'], 'Waiting for a valid design')
    : preview.instruments.length === 0
      ? idle('data', 'Data and storage', ['GAME MODEL'], 'Pick instruments to see how much data they make')
      : (() => {
          const frac = preview.storageMb > 0 ? preview.peakStorageMb / preview.storageMb : 1;
          const first = preview.storagePauseOrbits[0];
          const share = `${r(preview.dataFrac * 100)}% of the data reaches Earth.`;
          if (first !== undefined) {
            const more = preview.storagePauseOrbits.length - 1;
            return view('data', 'Data and storage', ['GAME MODEL'], {
              frac: 1, status: 'bad', statusText: 'Storage fills',
              text: `Instruments make ${r(perOrbit)} Mb per orbit but the link sends ${r(link)}. Storage (${r(preview.storageMb)} Mb) fills on orbit ${first}${more > 0 ? ` and ${more} more` : ''}, so instruments pause. ${share}`,
            });
          }
          const tight = frac > 0.85;
          return view('data', 'Data and storage', ['GAME MODEL'], {
            frac, status: tight ? 'tight' : 'ok', statusText: tight ? 'Nearly full' : undefined,
            text: perOrbit > link
              ? `Instruments make ${r(perOrbit)} Mb per orbit and the link sends ${r(link)}. Storage peaks at ${r(preview.peakStorageMb)} of ${r(preview.storageMb)} Mb. ${share}`
              : `Instruments make ${r(perOrbit)} Mb per orbit and the link sends ${r(link)}, so storage never fills. ${share}`,
          });
        })();

  const byId: Record<Meter, MeterView> = { mass, power, data, fuel, cost, science };
  return METER_ORDER.map((id) => byId[id]);
}

export interface DetailRow {
  label: string;
  value: string;
  labels: LabelKind[];
  term?: GlossaryKey;
}

/** Rows for the Engineering Detail drawer. */
export function detailRows(preview: Preview, design: Design, mission: MissionDef): DetailRow[] {
  const m = preview.metrics;
  if (!m || !preview.vehicle) return [];
  const eclipseH = m.eclipseMin / 60;
  const sunH = m.sunlitMin / 60;
  const usable = design.batteryWh * mission.bus.usableBatteryFrac;
  return [
    { label: 'Empty spacecraft', value: `${r(m.dryKg)} kg`, labels: ['GAME MODEL'] },
    { label: 'Fuel', value: `${r(design.propellantKg)} kg`, labels: ['GAME MODEL'] },
    { label: 'Weight at launch', value: `${r(m.wetKg)} kg of ${r(preview.vehicle.capacityKg)} kg`, labels: ['GAME MODEL'] },
    {
      label: 'Speed change available', term: 'delta-v',
      value: `${r(m.dvAvailableMps)} m/s (mission needs ${r(m.dvRequiredMps)} m/s)`,
      labels: ['SIMPLIFIED PHYSICS', 'UNVERIFIED PLACEHOLDER'],
    },
    {
      label: 'Engine efficiency', term: 'engine efficiency',
      value: `${r(mission.dv.ispS)} s`, labels: ['UNVERIFIED PLACEHOLDER'],
    },
    {
      label: 'Power use',
      value: `${r(m.loadW)} W (${r(mission.bus.baseLoadW)} W baseline plus instruments)`,
      labels: ['GAME MODEL'],
    },
    { label: 'Solar array', value: `${r(design.arrayW)} W in sunlight`, labels: ['GAME MODEL'] },
    {
      label: 'Data from instruments',
      value: `${r(preview.instruments.reduce((s, i) => s + i.dataMbPerOrbit, 0))} Mb per orbit`, labels: ['GAME MODEL'],
    },
    { label: 'Link to Earth', value: `${r(mission.bus.downlinkMbPerOrbit)} Mb per orbit`, labels: ['GAME MODEL'] },
    { label: 'Data storage', value: `${r(preview.storageMb)} Mb (peaks at ${r(preview.peakStorageMb)} Mb)`, labels: ['GAME MODEL'] },
    ...(mission.orbit.earthDistanceKm
      ? [{
          label: 'Radio delay to Earth',
          value: `${lightTimeS(mission.orbit.earthDistanceKm).toFixed(1)} s one way (display only)`,
          labels: ['NASA DATA', 'SIMPLIFIED PHYSICS'] as LabelKind[],
        }]
      : []),
    { label: 'Usable battery', term: 'usable battery', value: `${r(usable)} Wh`, labels: ['GAME MODEL'] },
    {
      label: 'One orbit', value: `${r(m.periodMin)} min (${r(m.eclipseMin)} min in eclipse)`,
      term: 'eclipse', labels: ['SIMPLIFIED PHYSICS', 'NASA DATA'],
    },
    {
      label: 'Energy used in one eclipse', value: `${r(m.loadW * eclipseH)} Wh`,
      labels: ['SIMPLIFIED PHYSICS'],
    },
    {
      label: 'Energy sunlight refills per orbit',
      value: `${r(Math.max(0, design.arrayW - m.loadW) * sunH)} Wh`, labels: ['SIMPLIFIED PHYSICS'],
    },
    { label: 'Total cost', value: `$${r(m.totalCostM)}M of $${r(mission.rules.budgetM)}M`, labels: ['GAME MODEL'] },
  ];
}
