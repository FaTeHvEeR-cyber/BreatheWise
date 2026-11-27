import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  applyRoomProfilePatch,
  clampActiveRooms,
  finalizeIntegerInput,
  sanitizeIntegerInput,
} from './numericInput';

test('sanitizeIntegerInput allows clearing and strips leading zeros cleanly', () => {
  assert.equal(sanitizeIntegerInput(''), '');
  assert.equal(sanitizeIntegerInput('0'), '0');
  assert.equal(sanitizeIntegerInput('00'), '0');
  assert.equal(sanitizeIntegerInput('012'), '12');
  assert.equal(sanitizeIntegerInput('005'), '5');
  assert.equal(sanitizeIntegerInput('24'), '24');
  assert.equal(sanitizeIntegerInput('-15'), '15');
});

test('finalizeIntegerInput clamps within bounds and uses fallback on empty', () => {
  assert.equal(finalizeIntegerInput('', 0, 200, 0), 0);
  assert.equal(finalizeIntegerInput('012', 0, 200, 0), 12);
  assert.equal(finalizeIntegerInput('250', 0, 200, 0), 200);
  assert.equal(finalizeIntegerInput('', 1, 20, 1), 1);
  assert.equal(finalizeIntegerInput('0', 1, 20, 1), 1);
  assert.equal(finalizeIntegerInput('3', 1, 20, 1), 3);
  assert.equal(finalizeIntegerInput('8', 1, 20, 1), 8);
  assert.equal(finalizeIntegerInput('25', 1, 20, 1), 20);
});

test('clampActiveRooms enforces 1 <= activeRooms <= totalRooms', () => {
  assert.equal(clampActiveRooms(undefined, 2), 2);
  assert.equal(clampActiveRooms(5, 2), 2);
  assert.equal(clampActiveRooms(0, 2), 1);
  assert.equal(clampActiveRooms(1, 3), 1);
  assert.equal(clampActiveRooms(3, 1), 1);
});

test('applyRoomProfilePatch never lets activeRoomCount exceed roomCount', () => {
  const base = { roomCount: 2, activeRoomCount: 2 };

  // Attempting to set activeRoomCount above roomCount clamps to roomCount without mutating roomCount
  const clamped = applyRoomProfilePatch(base, { activeRoomCount: 6 });
  assert.equal(clamped.roomCount, 2);
  assert.equal(clamped.activeRoomCount, 2);

  // Lowering activeRoomCount leaves total roomCount untouched
  const subset = applyRoomProfilePatch(base, { activeRoomCount: 1 });
  assert.equal(subset.roomCount, 2);
  assert.equal(subset.activeRoomCount, 1);

  // Reducing total roomCount clamps activeRoomCount down
  const shrunk = applyRoomProfilePatch({ roomCount: 4, activeRoomCount: 4 }, { roomCount: 2 });
  assert.equal(shrunk.roomCount, 2);
  assert.equal(shrunk.activeRoomCount, 2);

  // Raising total roomCount when all rooms were active auto-fills activeRoomCount to new total
  const expanded = applyRoomProfilePatch({ roomCount: 2, activeRoomCount: 2 }, { roomCount: 5 });
  assert.equal(expanded.roomCount, 5);
  assert.equal(expanded.activeRoomCount, 5);

  // Raising total roomCount when user chose a subset preserves that subset (<= total)
  const expandedSubset = applyRoomProfilePatch({ roomCount: 3, activeRoomCount: 1 }, { roomCount: 5 });
  assert.equal(expandedSubset.roomCount, 5);
  assert.equal(expandedSubset.activeRoomCount, 1);
});
