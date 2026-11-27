import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  calculateHabitSwapImpact,
  calculateIndoorMitigationImpact,
} from './emissionsCalculator';

test('indoor mitigation meter quantifies HEPA vs zero-purifier and gas vs induction reductions', () => {
  const hepaInduction = calculateIndoorMitigationImpact(150, {
    hasPurifier: true,
    cookingFuel: 'induction',
    hasKitchenExhaust: true,
    hasCrossVentilation: true,
    roomCount: 2,
  });

  const diyGas = calculateIndoorMitigationImpact(150, {
    hasPurifier: false,
    cookingFuel: 'lpg_gas',
    hasKitchenExhaust: false,
    hasCrossVentilation: false,
    roomCount: 3,
  });

  assert.ok(hepaInduction.afterPm25 < hepaInduction.beforePm25);
  assert.ok(hepaInduction.reductionPercent > diyGas.reductionPercent);
  assert.ok(diyGas.afterPm25 < diyGas.beforePm25);
  assert.ok(diyGas.reductionPercent > 20);

  const oversizedActive = calculateIndoorMitigationImpact(150, {
    hasPurifier: true,
    cookingFuel: 'induction',
    hasKitchenExhaust: true,
    hasCrossVentilation: true,
    roomCount: 2,
    activeRoomCount: 9,
  });
  assert.equal(oversizedActive.afterPm25, hepaInduction.afterPm25);
  assert.ok(oversizedActive.appliedMeasures.some((m) => m.includes('2 of 2 rooms')));
});

test('habit swap impact scales commute CO2/rupees with distance and caps PM2.5 reduction', () => {
  const shortCommute = calculateHabitSwapImpact(['metro-carpool', 'midday-venting'], 8, 120);
  const longCommute = calculateHabitSwapImpact(['metro-carpool', 'midday-venting'], 32, 120);
  const allSwaps = calculateHabitSwapImpact(
    ['metro-carpool', 'trip-chaining', 'midday-venting', 'chimney-induction', 'wet-mop-seal'],
    22,
    180,
  );

  assert.equal(shortCommute.selectedCount, 2);
  assert.ok(longCommute.weeklyCo2KgAvoided > shortCommute.weeklyCo2KgAvoided * 2);
  assert.ok(longCommute.monthlyRupeesSaved > shortCommute.monthlyRupeesSaved * 2);
  assert.ok(allSwaps.pm25ExposureReductionPct <= 72);
  assert.ok(allSwaps.pm25ExposureReductionPct >= 50);
});
