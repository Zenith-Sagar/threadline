import type { LaunchVehicle } from '@/data/schemas/types';

// GAME MODEL tiers. These are NOT real launch vehicles and carry no real payload figures.
// Phase 2: costs retuned by the balance sweep (see tests/sim/balance.test.ts).
export const VEHICLES: LaunchVehicle[] = [
  { id: 'light', name: 'Light launcher', label: 'GAME MODEL',
    capacityKg: 270, costM: 25, reliability: 0.9,
    why: 'Cheapest ride, but it can only lift a small spacecraft.' },
  { id: 'medium', name: 'Medium launcher', label: 'GAME MODEL',
    capacityKg: 380, costM: 45, reliability: 0.94,
    why: 'A balanced choice: room for heavier instruments and more fuel.' },
  { id: 'heavy', name: 'Heavy launcher', label: 'GAME MODEL',
    capacityKg: 520, costM: 80, reliability: 0.97,
    why: 'Lifts the most and fails least, but takes a big bite of the budget.' },
];
