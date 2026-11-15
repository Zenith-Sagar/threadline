import type { Instrument } from '@/data/schemas/types';

// All values: GAME MODEL (game-scaled, not real spacecraft specs).
// Phase 2: costs retuned by the balance sweep (tests/sim/balance.test.ts) so that cheap, power-hungry
// and robust strategies are all viable and no single design dominates.
export const INSTRUMENTS: Instrument[] = [
  {
    id: 'imager', name: 'Imaging camera', label: 'GAME MODEL',
    massKg: 9, powerW: 10, costM: 18, science: 14, dataMbPerOrbit: 8,
    suitability: { imaging: 0.95, composition: 0.2 },
    why: 'Takes pictures of the surface. Cheap and light, but it fills storage quickly.',
  },
  {
    id: 'spectro', name: 'Spectrometer', label: 'GAME MODEL',
    massKg: 7, powerW: 12, costM: 24, science: 18, dataMbPerOrbit: 6,
    suitability: { composition: 0.9, imaging: 0.2 },
    why: 'Useful for analyzing the composition of the target.',
  },
  {
    id: 'altimeter', name: 'Laser altimeter', label: 'GAME MODEL',
    massKg: 11, powerW: 18, costM: 26, science: 12, dataMbPerOrbit: 3,
    suitability: { imaging: 0.5, composition: 0.1 },
    why: 'Measures surface height to build terrain maps. Power-hungry for its science.',
  },
  {
    id: 'thermal', name: 'Thermal infrared radiometer', label: 'GAME MODEL',
    massKg: 8, powerW: 9, costM: 13, science: 10, dataMbPerOrbit: 4,
    suitability: { composition: 0.5, imaging: 0.3 },
    why: 'Measures how surface temperature changes. A modest, efficient choice.',
  },
  {
    id: 'magneto', name: 'Magnetometer', label: 'GAME MODEL',
    massKg: 4, powerW: 3, costM: 8, science: 6, dataMbPerOrbit: 1,
    suitability: { composition: 0.3, imaging: 0.0 },
    why: 'Senses magnetic fields. Tiny and thrifty, but a small science return.',
  },
  {
    id: 'radar', name: 'Radar sounder', label: 'GAME MODEL',
    massKg: 22, powerW: 38, costM: 50, science: 24, dataMbPerOrbit: 12,
    suitability: { composition: 0.6, imaging: 0.4 },
    why: 'Probes below the surface. The biggest science return, and the biggest power bill.',
  },
];
