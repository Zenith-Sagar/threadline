// Share links: design + seed + variant (+ the storm response) in the URL hash, with a version field.
//
//   #v=1&seed=29&mission=standard&inst=imager,spectro,thermal&veh=medium&bat=150&arr=320&fuel=63&store=120&resp=shed-heaviest
//
// A link is UNTRUSTED INPUT (anyone can type anything after the #). decodeShare therefore:
//   - rejects anything over MAX_HASH_LENGTH, unknown versions, repeated fields, bad seeds, unknown
//     variants, unknown instruments or launchers, and the wrong number of instruments;
//   - CLAMPS out-of-range numbers to the slider ranges and says so (`adjusted`);
//   - drops an unknown storm response and says so;
//   - never throws, and never trusts a tier: the receiver re-runs simulate(), so the tier shown is computed locally.
// The result is always a design the Design Bay can show, or a plain-language reason it could not.
import { applyVariant, isVariantId, type VariantId } from '@/content/variants';
import { sanitizeDesign } from '@/core/restore';
import { isDesign } from '@/data/schemas/guards';
import type { Design, MissionDef, ResponseId } from '@/data/schemas/types';
import { RESPONSE_IDS } from '@/sim';

export const SHARE_VERSION = 1;
export const MAX_HASH_LENGTH = 600;

export interface SharedMission {
  variant: VariantId;
  seed: number;
  design: Design;
  /** The storm response the sharer chose, or null (rode it out / no storm). */
  response: ResponseId | null;
}

export type DecodeResult =
  | { ok: true; share: SharedMission; /** Plain-language notes about anything that was adjusted or dropped. */ adjusted: string[] }
  | { ok: false; reason: string };

const num = (n: number): string => String(Math.round(n));

/** Build the hash text (without the leading "#"). */
export function encodeShare(s: SharedMission): string {
  const parts = [
    `v=${SHARE_VERSION}`,
    `seed=${Math.trunc(s.seed) >>> 0}`,
    `mission=${s.variant}`,
    `inst=${s.design.instruments.map(encodeURIComponent).join(',')}`,
    `veh=${encodeURIComponent(s.design.vehicle)}`,
    `bat=${num(s.design.batteryWh)}`,
    `arr=${num(s.design.arrayW)}`,
    `fuel=${num(s.design.propellantKg)}`,
    `store=${num(s.design.storageMb ?? 0)}`,
  ];
  if (s.response) parts.push(`resp=${s.response}`);
  return parts.join('&');
}

/** Does this location hash look like a share link (so main.ts should try to open it)? */
export const isShareHash = (hash: string): boolean => /^#?v=/.test(hash.trim());

const NUMBER_RE = /^-?\d{1,7}(\.\d{1,3})?$/;
const ID_RE = /^[a-z][a-z0-9-]{0,24}$/;
const reject = (reason: string): DecodeResult => ({ ok: false, reason });

export function decodeShare(hash: string, base: MissionDef): DecodeResult {
  try {
    const text = hash.trim().replace(/^#/, '');
    if (text.length === 0) return reject('The link is empty.');
    if (text.length > MAX_HASH_LENGTH) return reject('The link is too long to be one of ours.');
    const params = new URLSearchParams(text);
    const seen = new Set<string>();
    for (const key of params.keys()) {
      if (seen.has(key)) return reject('The link repeats a field, so it cannot be trusted.');
      seen.add(key);
    }
    const get = (k: string): string | null => params.get(k);

    const version = get('v');
    if (version === null || !/^\d{1,3}$/.test(version)) return reject('The link has no version.');
    if (Number(version) !== SHARE_VERSION) return reject(`The link was made by a different version of the game (version ${version}).`);

    const seedText = get('seed');
    if (seedText === null || !/^\d{1,10}$/.test(seedText) || Number(seedText) > 4294967295) return reject('The link has an invalid seed.');
    const seed = Number(seedText);

    const variantText = get('mission');
    if (!isVariantId(variantText)) return reject('The link names a mission variant this version does not have.');
    const mission = applyVariant(base, variantText);

    const instText = get('inst');
    if (instText === null) return reject('The link has no instruments.');
    const instruments = instText.split(',').filter((x) => x !== '');
    if (instruments.length !== mission.rules.instrumentCount) return reject(`The link must name exactly ${mission.rules.instrumentCount} instruments.`);
    if (new Set(instruments).size !== instruments.length) return reject('The link repeats an instrument.');
    for (const id of instruments) {
      if (!ID_RE.test(id) || !mission.instruments.some((i) => i.id === id)) return reject('The link names an instrument this version does not have.');
    }

    const vehicle = get('veh');
    if (vehicle === null || !ID_RE.test(vehicle) || !mission.vehicles.some((v) => v.id === vehicle)) return reject('The link names a launcher this version does not have.');

    const readNum = (key: string): number | null => {
      const t = get(key);
      return t !== null && NUMBER_RE.test(t) ? Number(t) : null;
    };
    const bat = readNum('bat');
    const arr = readNum('arr');
    const fuel = readNum('fuel');
    const store = readNum('store');
    if (bat === null || arr === null || fuel === null || store === null) return reject('The link has a missing or invalid number.');

    const raw: Design = { instruments, vehicle, batteryWh: bat, arrayW: arr, propellantKg: fuel, storageMb: store };
    if (!isDesign(raw)) return reject('The link does not describe a valid design.');
    const design = sanitizeDesign(raw, mission);

    const adjusted: string[] = [];
    const check = (label: string, before: number, after: number): void => {
      if (Math.round(before) !== after) adjusted.push(`${label} was adjusted to fit this game's limits.`);
    };
    check('Battery size', bat, design.batteryWh);
    check('Solar array size', arr, design.arrayW);
    check('Propellant', fuel, design.propellantKg);
    check('Storage', store, design.storageMb ?? store);

    let response: ResponseId | null = null;
    const respText = get('resp');
    if (respText !== null) {
      if ((RESPONSE_IDS as string[]).includes(respText)) response = respText as ResponseId;
      else adjusted.push('The storm response in the link was not recognised, so it was ignored.');
    }
    return { ok: true, share: { variant: variantText, seed, design, response }, adjusted };
  } catch {
    return reject('The link could not be read.');
  }
}
