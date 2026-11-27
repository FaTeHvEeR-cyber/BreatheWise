/**
 * Pure helpers for keyboard-friendly controlled integer inputs.
 * Allows clearing to "" while editing and immediately strips extra leading zeros
 * (e.g. typing "12" next to "0" produces "12", never "012").
 */
export function sanitizeIntegerInput(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 0) return '';
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

/**
 * Parses and clamps a string integer input on blur or form submission.
 */
export function finalizeIntegerInput(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const cleaned = sanitizeIntegerInput(raw);
  if (cleaned.length === 0) return fallback;
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Guarantees active rooms/zones is always within [1, totalRooms].
 */
export function clampActiveRooms(
  activeRooms: number | undefined,
  totalRooms: number,
): number {
  const safeTotal = Math.max(1, Math.min(20, Math.round(Number.isFinite(totalRooms) ? totalRooms : 1)));
  if (activeRooms === undefined || !Number.isFinite(activeRooms)) return safeTotal;
  return Math.max(1, Math.min(safeTotal, Math.round(activeRooms)));
}

/**
 * Applies a partial room-count update while strictly enforcing 1 <= activeRoomCount <= roomCount.
 */
export function applyRoomProfilePatch<T extends { roomCount: number; activeRoomCount?: number }>(
  prev: T,
  patch: Partial<T>,
): T {
  const prevTotal = Math.max(1, Math.min(20, Math.round(prev.roomCount)));
  const prevActive = clampActiveRooms(prev.activeRoomCount, prevTotal);
  const nextTotal =
    patch.roomCount !== undefined && Number.isFinite(patch.roomCount)
      ? Math.max(1, Math.min(20, Math.round(patch.roomCount)))
      : prevTotal;

  let nextActive: number;
  if (patch.activeRoomCount !== undefined) {
    nextActive = clampActiveRooms(patch.activeRoomCount, nextTotal);
  } else if (patch.roomCount !== undefined && prevActive === prevTotal) {
    // User had all rooms active; keep active rooms auto-filled to the updated house room count.
    nextActive = nextTotal;
  } else {
    // Clamp down whenever total house rooms drops below active rooms.
    nextActive = Math.min(prevActive, nextTotal);
  }

  return {
    ...prev,
    ...patch,
    roomCount: nextTotal,
    activeRoomCount: nextActive,
  };
}
