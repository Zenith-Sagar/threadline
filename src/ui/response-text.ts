// Plain-language cost and risk text for each storm response. Pure (no DOM), so it is unit-tested.
// Used by Mission Control (the live decision) and the Design Bay (changing the decision while rewinding).
// No recommendation is ever produced here: it only states what each choice gives up and risks.
import type { ResponseOption } from '@/sim';

export interface ResponseText {
  cost: string;
  /** The full risk sentence (used where a card stands alone, e.g. the rewind picker in the Design Bay). */
  risk: string;
  /**
   * Phase 7 (finding F4): the SHORT risk line for Mission Control. It names which instruments are left running and
   * exposed. The chance itself is stated once for all three cards by describeSharedRisk(), so three cards no longer
   * repeat the same sentence (that repetition made the decision take about three phone screens).
   */
  exposure: string;
  power: string;
}

const r = (n: number): number => Math.round(n);

export function describeResponse(o: ResponseOption): ResponseText {
  const given = o.scienceGivenUpPerOrbit;
  const cost =
    given > 0
      ? `Gives up ${r(given)} science points on each of the ${o.stormOrbits} storm orbits (${r(given * o.stormOrbits)} in all).`
      : 'Gives up no science while the storm lasts.';
  const risk =
    o.exposedNames.length > 0
      ? `Each running instrument (${o.exposedNames.join(', ')}) has a ${r(o.damageChancePerInstrument * 100)}% chance of permanent radiation damage on each storm orbit.`
      : 'Nothing is running, so there is no radiation damage.';
  const first = o.projectedSafeModeOrbits[0];
  const more = o.projectedSafeModeOrbits.length - 1;
  const forecast =
    first === undefined
      ? 'Forecast: no safe mode from the storm on.'
      : `Forecast: safe mode on orbit ${first}${more > 0 ? ` and ${more} more` : ''}, which costs more science.`;
  const exposure =
    o.exposedNames.length > 0
      ? `Left running and exposed: ${o.exposedNames.join(', ')}.`
      : 'Nothing is left running, so there is no radiation damage.';
  const power = `Uses ${r(o.loadW)} W while the array makes about ${r(o.stormArrayW)} W. ${forecast}`;
  return { cost, risk, exposure, power };
}

/**
 * The radiation risk, stated ONCE for the whole decision (Phase 7, finding F4). It is the same chance for every
 * instrument that is left running; the cards say which instruments those are.
 */
export function describeSharedRisk(options: ResponseOption[]): string {
  const chance = (options.find((o) => o.exposedNames.length > 0) ?? options[0])?.damageChancePerInstrument ?? 0;
  return `Any instrument left running has a ${r(chance * 100)}% chance of permanent radiation damage on each storm orbit. An instrument that is switched off cannot be damaged.`;
}
