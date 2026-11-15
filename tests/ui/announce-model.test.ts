import { describe, expect, it } from 'vitest';
import { LUNAR_RECON as M } from '@/content';
import type { Design } from '@/data/schemas/types';
import { previewMission } from '@/sim';
import { describeChange } from '@/ui/announce-model';

const base: Design = { instruments: ['imager', 'spectro'], vehicle: 'medium', batteryWh: 150, arrayW: 250, propellantKg: 90, storageMb: 120 };
const withRadar: Design = { ...base, instruments: [...base.instruments, 'radar'] };

describe('describeChange: every thread also gets a sentence', () => {
  it('says what an instrument adds, in words and units', () => {
    const t = describeChange('Radar sounder', previewMission(base, M), previewMission(withRadar, M));
    expect(t).toMatch(/^Radar sounder: adds /);
    expect(t).toContain('38 W of load to Power'); // radar draws 38 W in the content
    expect(t).toContain('22 kg to Weight');
    expect(t).toMatch(/to Cost/);
    expect(t).toContain('12 Mb per orbit to Data');
    expect(t).toMatch(/to Science/);
  });

  it('says "removes ... from" when the change goes the other way', () => {
    const t = describeChange('Radar sounder removed', previewMission(withRadar, M), previewMission(base, M));
    expect(t).toContain('removes');
    expect(t).toContain('38 W of load from Power');
    expect(t).toContain('22 kg from Weight');
    // Fuel is fixed in this test, so a lighter spacecraft honestly GAINS fuel margin: both directions can appear.
    expect(t).toMatch(/adds [\d.]+ points of margin to Fuel/);
  });

  it('describes a battery change through the reserve, since the load did not move', () => {
    const t = describeChange('Battery 200 Wh', previewMission(base, M), previewMission({ ...base, batteryWh: 200 }, M));
    expect(t).toMatch(/battery reserve to Power|battery reserve from Power/);
    expect(t).toMatch(/Weight/);
    expect(t).toMatch(/Cost/);
  });

  it('describes a storage change in megabits of storage', () => {
    const t = describeChange('Storage 180 Mb', previewMission(base, M), previewMission({ ...base, storageMb: 180 }, M));
    expect(t).toContain('60 Mb of storage to Data');
  });

  it('is honest when nothing moved', () => {
    const p = previewMission(base, M);
    expect(describeChange('Nothing', p, p)).toBe('Nothing: no meter changed.');
  });
});
