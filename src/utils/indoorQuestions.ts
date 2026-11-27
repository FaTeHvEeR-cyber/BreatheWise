import type {
  AppliedShockPatch,
  ClarifyingQuestion,
  HouseholdProfile,
  SmogShockStrategy,
} from '../types';

/**
 * Generates up to 3 concise indoor air-quality / budget-mode questions,
 * skipping setup fields already answered in the Household Profile.
 */
export function buildInitialIndoorQuestions(
  profile: HouseholdProfile,
  hasHouseholdProfile: boolean,
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  if (!profile.hasPurifier) {
    questions.push({
      id: 'in-diy',
      question: 'Do you have a box fan or pedestal fan for DIY filtration?',
      reason: 'Determines whether a Corsi-Rosenthal MERV-13 DIY filter is viable.',
      quickOptions: ['Yes — box/table fan', 'Ceiling fans only', 'No spare fan'],
    });
  } else {
    questions.push({
      id: 'in-filter',
      question: 'When was your HEPA purifier filter last vacuumed or replaced?',
      reason: 'Clogged pre-filters cut real indoor CADR by up to 40%.',
      quickOptions: ['Within 30 days', '2–6 months ago', 'Over 6 months / unsure'],
    });
  }

  questions.push({
    id: 'in-sources',
    question: 'Are incense, dhoop, mosquito coils, or dry brooming used indoors?',
    reason: 'Combustion coils and dry sweeping spike indoor PM2.5 above outdoor levels.',
    quickOptions: ['Yes — daily', 'Occasionally', 'None — wet mop only'],
  });

  if (!hasHouseholdProfile || !profile.hasCrossVentilation) {
    questions.push({
      id: 'in-gaps',
      question: 'Do balcony doors or windows face a main road with visible gaps?',
      reason: 'Guides weather-stripping and damp draft-stopper priority.',
      quickOptions: ['Yes — road-facing gaps', 'Inner courtyard only', 'Tight uPVC sealed'],
    });
  }

  return questions.slice(0, 3);
}

/**
 * Deterministic 2-question fallback when requesting 2 additional questions offline.
 */
export function buildExtraFallbackQuestions(
  existingCount: number,
  focus: 'intake' | 'indoor',
): ClarifyingQuestion[] {
  const baseIdx = existingCount + 1;
  if (focus === 'indoor') {
    return [
      {
        id: `in-extra-${baseIdx}`,
        question: 'Which room do family members spend the most daytime hours in?',
        reason: 'Focuses clean-room sealing where exposure hours are highest.',
        quickOptions: ['Living room / hall', 'Home office / study', 'Bedroom / nursery'],
      },
      {
        id: `in-extra-${baseIdx + 1}`,
        question: 'Do you run AC recirculation or an evaporative cooler during smog?',
        reason: 'Swamp coolers pull outdoor smog in; AC recirculate helps isolate indoor air.',
        quickOptions: ['Split AC (recirculate)', 'Air cooler / window fan', 'Neither active'],
      },
    ];
  }

  return [
    {
      id: `q-extra-${baseIdx}`,
      question: 'Do you have outdoor errands or school pickups between 4 PM and 8 PM?',
      reason: 'Evening traffic inversion rapidly raises kerbside PM2.5 and NO₂.',
      quickOptions: ['Yes — daily pickup/errand', 'Can batch to midday', 'Stay indoors after 4 PM'],
    },
    {
      id: `q-extra-${baseIdx + 1}`,
      question: 'Are N95/FFP2 masks already available at home for outdoor trips?',
      reason: 'Adjusts transit and walking recommendations to available gear.',
      quickOptions: ['Yes — fitted N95 ready', 'Surgical/cloth masks only', 'Need mask guidance'],
    },
  ];
}

/**
 * Appends up to `maxAdd` non-duplicate questions with guaranteed unique IDs.
 */
export function mergeUniqueQuestions(
  existing: readonly ClarifyingQuestion[],
  incoming: readonly ClarifyingQuestion[],
  maxAdd = 2,
): ClarifyingQuestion[] {
  const seenText = new Set(existing.map((q) => q.question.trim().toLowerCase()));
  const seenIds = new Set(existing.map((q) => q.id));
  const merged = [...existing];
  let added = 0;

  for (const item of incoming) {
    if (added >= maxAdd) break;
    const norm = item.question.trim().toLowerCase();
    if (!norm || seenText.has(norm)) continue;
    let uniqueId = item.id.trim() || `q-${merged.length + 1}`;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${uniqueId}-${merged.length + 1}`;
    }
    seenText.add(norm);
    seenIds.add(uniqueId);
    merged.push({ ...item, id: uniqueId });
    added += 1;
  }

  return merged;
}

/**
 * Records an applied smog shock patch, replacing any earlier patch targeting the same time block.
 */
export function upsertAppliedShockPatch(
  existing: readonly AppliedShockPatch[],
  scenario: string,
  strategy: SmogShockStrategy,
): AppliedShockPatch[] {
  const filtered = existing.filter((p) => p.targetTimeBlock !== strategy.targetTimeBlock);
  return [
    ...filtered,
    {
      strategyId: strategy.id,
      scenario,
      title: strategy.title,
      targetTimeBlock: strategy.targetTimeBlock,
    },
  ];
}

export function isShockStrategyApplied(
  appliedPatches: readonly AppliedShockPatch[],
  scenario: string,
  strategy: SmogShockStrategy,
): boolean {
  return appliedPatches.some(
    (p) =>
      p.targetTimeBlock === strategy.targetTimeBlock &&
      p.title === strategy.title &&
      p.scenario === scenario,
  );
}
