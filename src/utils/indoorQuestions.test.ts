import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExtraFallbackQuestions,
  buildInitialIndoorQuestions,
  isShockStrategyApplied,
  mergeUniqueQuestions,
  upsertAppliedShockPatch,
} from './indoorQuestions';
import { EMPTY_HOUSEHOLD_PROFILE } from '../data/breatheWisePresets';
import type { SmogShockStrategy } from '../types';

test('buildInitialIndoorQuestions returns 3 or fewer questions adapted to profile', () => {
  const budgetQuestions = buildInitialIndoorQuestions(EMPTY_HOUSEHOLD_PROFILE, false);
  assert.ok(budgetQuestions.length <= 3 && budgetQuestions.length >= 2);
  assert.ok(budgetQuestions[0].question.toLowerCase().includes('fan'));

  const hepaProfile = { ...EMPTY_HOUSEHOLD_PROFILE, hasPurifier: true, hasCrossVentilation: true };
  const hepaQuestions = buildInitialIndoorQuestions(hepaProfile, true);
  assert.ok(hepaQuestions.length <= 3);
  assert.equal(hepaQuestions.length, 2);
  assert.ok(hepaQuestions[0].question.toLowerCase().includes('hepa'));
});

test('mergeUniqueQuestions appends up to 2 unique questions without duplicate IDs', () => {
  const initial = buildInitialIndoorQuestions(EMPTY_HOUSEHOLD_PROFILE, false);
  const extra = buildExtraFallbackQuestions(initial.length, 'indoor');
  const merged = mergeUniqueQuestions(initial, [initial[0], ...extra], 2);
  assert.equal(merged.length, initial.length + 2);
  const ids = new Set(merged.map((q) => q.id));
  assert.equal(ids.size, merged.length);
});

test('upsertAppliedShockPatch tracks active routine patches per timeBlock accurately', () => {
  const s1: SmogShockStrategy = {
    id: 'shock-1',
    title: 'Switch to Enclosed AC Transit',
    targetTimeBlock: 'Morning',
    immediateAction: 'Use AC Metro.',
    healthAndEmissionImpact: 'Cuts PM2.5 by 55%.',
    updatedRoutineTitle: 'Emergency Transit Shift',
  };
  const s2: SmogShockStrategy = {
    id: 'shock-2',
    title: 'Delay Outdoor Commute',
    targetTimeBlock: 'Morning',
    immediateAction: 'Work from home until 11 AM.',
    healthAndEmissionImpact: 'Avoids peak inversion.',
    updatedRoutineTitle: 'WFH Morning Hold',
  };
  const s3: SmogShockStrategy = {
    id: 'shock-3',
    title: 'Seal Kitchen Plumes',
    targetTimeBlock: 'Evening',
    immediateAction: 'Use induction only.',
    healthAndEmissionImpact: 'Cuts indoor spikes.',
    updatedRoutineTitle: 'Zero-Smoke Dinner',
  };

  let patches = upsertAppliedShockPatch([], 'Stubble smoke surge', s1);
  assert.equal(isShockStrategyApplied(patches, 'Stubble smoke surge', s1), true);
  assert.equal(isShockStrategyApplied(patches, 'Stubble smoke surge', s2), false);

  // Patching the same time block replaces s1 with s2
  patches = upsertAppliedShockPatch(patches, 'Stubble smoke surge', s2);
  assert.equal(isShockStrategyApplied(patches, 'Stubble smoke surge', s1), false);
  assert.equal(isShockStrategyApplied(patches, 'Stubble smoke surge', s2), true);

  // Patching a different time block keeps both
  patches = upsertAppliedShockPatch(patches, 'Stubble smoke surge', s3);
  assert.equal(patches.length, 2);
  assert.equal(isShockStrategyApplied(patches, 'Stubble smoke surge', s2), true);
  assert.equal(isShockStrategyApplied(patches, 'Stubble smoke surge', s3), true);
});
