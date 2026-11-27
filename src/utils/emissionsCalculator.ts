import type { HabitSwapSpec, HouseholdProfile } from '../types';
import { HABIT_SWAP_CATALOG } from '../data/breatheWisePresets';
import { clampActiveRooms } from './numericInput';

export interface IndoorMitigationMeter {
  outdoorPm25: number;
  beforePm25: number;
  afterPm25: number;
  reductionPercent: number;
  appliedMeasures: string[];
}

export interface SwapImpactRow {
  swap: HabitSwapSpec;
  weeklyCo2Kg: number;
  pm25ReductionPct: number;
  monthlyRupeesSaved: number;
}

export interface HabitSwapTotals {
  selectedCount: number;
  weeklyCo2KgAvoided: number;
  annualCo2KgAvoided: number;
  pm25ExposureReductionPct: number;
  monthlyRupeesSaved: number;
  rows: SwapImpactRow[];
}

export function calculateIndoorMitigationImpact(
  outdoorPm25: number,
  profile: Pick<
    HouseholdProfile,
    'hasPurifier' | 'cookingFuel' | 'hasKitchenExhaust' | 'hasCrossVentilation' | 'roomCount' | 'activeRoomCount'
  >,
): IndoorMitigationMeter {
  const safeOutdoor = Math.max(0, outdoorPm25);
  const activeRooms = clampActiveRooms(profile.activeRoomCount, profile.roomCount);
  // Unmitigated Indian urban flat baseline: ~0.78 infiltration + indoor cooking plume
  const cookingBaselineAdd = profile.cookingFuel === 'induction' ? 4 : 24;
  const beforePm25 = Number((safeOutdoor * 0.78 + cookingBaselineAdd).toFixed(1));

  let retentionFactor = 0.64; // Base sealed doors/windows + wet mopping
  const appliedMeasures: string[] = ['Sealed draft gaps & wet microfiber mopping'];

  if (profile.hasPurifier) {
    const roomPenalty = Math.min(0.14, Math.max(0, (activeRooms - 1) * 0.04));
    retentionFactor = Math.max(0.16, 0.22 + roomPenalty);
    appliedMeasures.push(
      `HEPA purifier active (${activeRooms} of ${profile.roomCount} ${profile.roomCount === 1 ? 'room' : 'rooms'})`,
    );
  } else {
    retentionFactor = 0.48;
    appliedMeasures.push('Budget zero-purifier seal + DIY box-fan / wet-cloth dust capture');
  }

  if (profile.hasCrossVentilation) {
    retentionFactor = Number((retentionFactor * 0.94).toFixed(2));
    appliedMeasures.push('Timed cross-ventilation strictly during cleanest forecast window');
  }

  const cookingAfterAdd =
    profile.cookingFuel === 'induction'
      ? 2
      : profile.hasKitchenExhaust
        ? 6
        : 14;

  if (profile.cookingFuel === 'induction') {
    appliedMeasures.push('Induction cooking avoids indoor gas NO₂ & soot');
  } else if (profile.hasKitchenExhaust) {
    appliedMeasures.push('Kitchen exhaust/chimney vented during & 5 min post-tadka');
  }

  const afterPm25 = Number(
    Math.min(beforePm25, Math.max(1.5, safeOutdoor * retentionFactor + cookingAfterAdd)).toFixed(1),
  );

  const reductionPercent =
    beforePm25 > 0 ? Math.max(0, Math.min(90, Math.round(((beforePm25 - afterPm25) / beforePm25) * 100))) : 0;

  return {
    outdoorPm25: Number(safeOutdoor.toFixed(1)),
    beforePm25,
    afterPm25,
    reductionPercent,
    appliedMeasures,
  };
}

export function calculateHabitSwapImpact(
  selectedSwapIds: readonly string[],
  commuteDistanceKm: number,
  outdoorPm25: number,
  catalog: readonly HabitSwapSpec[] = HABIT_SWAP_CATALOG,
): HabitSwapTotals {
  const safeDist = Math.max(2, Math.min(80, commuteDistanceKm));
  const distScale = safeDist / 16; // Normalized against 16 km reference commute
  const smogMultiplier = outdoorPm25 > 90 ? 1.15 : outdoorPm25 > 60 ? 1.05 : 0.95;

  const selectedSet = new Set(selectedSwapIds);
  const rows: SwapImpactRow[] = catalog.map((swap) => {
    const scale = swap.scalesWithCommuteKm ? distScale : 1;
    const weeklyCo2Kg = Number((swap.weeklyCo2KgBase * scale).toFixed(1));
    const monthlyRupeesSaved = Math.round(swap.monthlyRupeesBase * scale);
    const pm25ReductionPct = Math.round(swap.pm25ReductionPct * smogMultiplier);
    return {
      swap,
      weeklyCo2Kg,
      pm25ReductionPct,
      monthlyRupeesSaved,
    };
  });

  const activeRows = rows.filter((r) => selectedSet.has(r.swap.id));
  const weeklyCo2KgAvoided = Number(
    activeRows.reduce((sum, r) => sum + r.weeklyCo2Kg, 0).toFixed(1),
  );
  const monthlyRupeesSaved = activeRows.reduce((sum, r) => sum + r.monthlyRupeesSaved, 0);

  // Diminishing returns combination so total PM2.5 exposure reduction stays realistic (capped at 72%)
  let remainingExposure = 1;
  for (const r of activeRows) {
    remainingExposure *= 1 - Math.min(0.4, r.pm25ReductionPct / 100);
  }
  const pm25ExposureReductionPct = Math.min(72, Math.round((1 - remainingExposure) * 100));

  return {
    selectedCount: activeRows.length,
    weeklyCo2KgAvoided,
    annualCo2KgAvoided: Number((weeklyCo2KgAvoided * 48).toFixed(0)),
    pm25ExposureReductionPct,
    monthlyRupeesSaved,
    rows,
  };
}
