import { describe, expect, it } from 'vitest';
import { LUNAR_RECON } from '@/content';
import { listResponses } from '@/sim';
import { describeResponse, describeSharedRisk } from '@/ui/response-text';
import { buildUiDesign } from '../sim/helpers';

const design = buildUiDesign(['imager', 'spectro', 'thermal'], 'medium', 150, 320);
const options = listResponses(design, LUNAR_RECON, 1);

describe('describeResponse', () => {
  it('states a cost, a risk and the power picture for every response', () => {
    expect(options).toHaveLength(3);
    for (const o of options) {
      const t = describeResponse(o);
      for (const text of [t.cost, t.risk, t.power]) expect(text.length).toBeGreaterThan(10);
      expect(t.power).toMatch(/Forecast/);
    }
  });

  it('numbers match the model: safe mode gives up everything and risks nothing; riding it out gives up nothing', () => {
    const [ride, shed, safe] = options.map(describeResponse);
    expect(ride?.cost).toMatch(/no science/);
    expect(ride?.risk).toMatch(/15% chance/);
    expect(shed?.cost).toMatch(/18 science points on each of the 3 storm orbits \(54 in all\)/); // the spectrometer: 12 W, the biggest power user, 18 science
    expect(safe?.cost).toMatch(/42 science points on each of the 3 storm orbits/); // 14 + 18 + 10
    expect(safe?.risk).toMatch(/no radiation damage/);
  });

  it('never recommends anything', () => {
    for (const o of options) {
      const t = describeResponse(o);
      expect(`${t.cost} ${t.risk} ${t.power}`).not.toMatch(/recommend|should|best|safest/i);
    }
  });

  it('Phase 7 (F4): the short risk line names the exposed instruments and never repeats the percentage', () => {
    const [ride, shed, safe] = options.map(describeResponse);
    expect(ride?.exposure).toMatch(/Left running and exposed: Imaging camera, Spectrometer, Thermal infrared radiometer\./);
    expect(shed?.exposure).not.toMatch(/Spectrometer/); // switched off, so not exposed
    expect(safe?.exposure).toMatch(/Nothing is left running/);
    for (const t of [ride, shed, safe]) expect(t?.exposure).not.toMatch(/%/);
  });

  it('Phase 7 (F4): the chance is stated once, with the rule that a switched-off instrument cannot be damaged', () => {
    const line = describeSharedRisk(options);
    expect(line).toMatch(/15% chance of permanent radiation damage on each storm orbit/);
    expect(line).toMatch(/switched off cannot be damaged/);
    expect(line).not.toMatch(/recommend|should|best|safest/i);
    expect(describeSharedRisk([])).toMatch(/0%/); // no options: still a sentence, never a crash
  });
});
