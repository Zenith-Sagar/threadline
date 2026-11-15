// Data channel helpers. Label: GAME MODEL.
import type { Design, MissionDef } from '@/data/schemas/types';

/** Storage the design carries: its own choice, or the mission default. */
export function storageMbOf(design: Design, mission: MissionDef): number {
  return typeof design.storageMb === 'number' ? design.storageMb : mission.bus.defaultStorageMb;
}
