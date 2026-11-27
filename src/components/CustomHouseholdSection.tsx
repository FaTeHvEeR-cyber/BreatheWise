import { useEffect, useRef, useState } from 'react';
import type { HouseholdProfile } from '../types';
import { MAX_COMMUTE_KM, MAX_ROOMS } from '../data/breatheWisePresets';
import { clampActiveRooms, finalizeIntegerInput } from '../utils/numericInput';
import { HouseholdProfileFields } from './HouseholdProfileFields';

interface CustomHouseholdSectionProps {
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  onSyncSetup: (patch: Partial<HouseholdProfile>) => void;
  onSaveCustomProfile: (custom: HouseholdProfile) => void;
  onClearHousehold: () => void;
}

/** Custom household profile builder synced with the Indoor Lab and Routine workspaces. */
export function CustomHouseholdSection({
  profile,
  hasHouseholdProfile,
  onSyncSetup,
  onSaveCustomProfile,
  onClearHousehold,
}: CustomHouseholdSectionProps) {
  const [draft, setDraft] = useState<HouseholdProfile>(profile);
  const [commuteInput, setCommuteInput] = useState<string>(String(profile.commuteDistanceKm));
  const [roomsInput, setRoomsInput] = useState<string>(String(profile.roomCount));
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const prevProfileRef = useRef<HouseholdProfile>(profile);

  useEffect(() => {
    const prev = prevProfileRef.current;
    prevProfileRef.current = profile;
    setDraft(profile);
    const profileSwitched = prev.profileName !== profile.profileName;
    if (profileSwitched || profile.commuteDistanceKm !== prev.commuteDistanceKm) {
      setCommuteInput(String(profile.commuteDistanceKm));
    }
    if (profileSwitched || profile.roomCount !== prev.roomCount) {
      setRoomsInput(String(profile.roomCount));
    }
  }, [profile]);

  const updateAndSync = (patch: Partial<HouseholdProfile>) => {
    setDraft((d) => ({ ...d, ...patch }));
    onSyncSetup(patch);
  };

  const handleClear = () => {
    onClearHousehold();
    setCommuteInput('0');
    setRoomsInput('1');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCommuteKm = finalizeIntegerInput(commuteInput, 0, MAX_COMMUTE_KM, 0);
    const finalRoomCount = finalizeIntegerInput(roomsInput, 1, MAX_ROOMS, 1);
    setCommuteInput(String(finalCommuteKm));
    setRoomsInput(String(finalRoomCount));

    const cleanName = draft.profileName.trim() || 'Custom Household';
    const cleanSummary =
      draft.personaSummary.trim() ||
      `${finalRoomCount}-room home (${draft.cookingFuel.replace('_', ' ')}, ${draft.hasPurifier ? 'HEPA purifier' : 'no purifier'}, ${finalCommuteKm} km daily commute)`;
    onSaveCustomProfile({
      ...draft,
      commuteDistanceKm: finalCommuteKm,
      roomCount: finalRoomCount,
      activeRoomCount: clampActiveRooms(draft.activeRoomCount, finalRoomCount),
      profileName: cleanName,
      personaSummary: cleanSummary,
      vulnerableMembers: draft.vulnerableMembers.trim() || 'General household members',
    });
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2600);
  };

  return (
    <section
      aria-label="Specify your own household profile"
      className="border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Your Individual Household Profile
          </h2>
          <p className="text-xs text-slate-600">
            Specify your own home setup, commute, and family sensitivities—or customize any verified
            scenario above. Shared indoor options auto-fill in the Indoor Lab.
          </p>
        </div>
        {hasHouseholdProfile && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear Household
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <HouseholdProfileFields
          draft={draft}
          commuteInput={commuteInput}
          roomsInput={roomsInput}
          onChangeDraft={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onSyncSetup={updateAndSync}
          onChangeCommuteText={setCommuteInput}
          onChangeRoomsText={setRoomsInput}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-800">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={draft.hasPurifier}
                onChange={(e) => updateAndSync({ hasPurifier: e.target.checked })}
                className="h-4 w-4 accent-teal-800"
              />
              HEPA Air Purifier
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={draft.hasKitchenExhaust}
                onChange={(e) => updateAndSync({ hasKitchenExhaust: e.target.checked })}
                className="h-4 w-4 accent-teal-800"
              />
              Kitchen Chimney / Exhaust
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={draft.hasCrossVentilation}
                onChange={(e) => updateAndSync({ hasCrossVentilation: e.target.checked })}
                className="h-4 w-4 accent-teal-800"
              />
              Cross-Ventilation Windows
            </label>
          </div>

          <div className="flex items-center gap-3">
            {savedToast && (
              <span role="status" className="font-mono text-xs font-medium text-teal-900">
                Household profile applied
              </span>
            )}
            <button
              type="submit"
              className="rounded-md bg-teal-800 px-4 py-2 text-xs font-medium text-white whitespace-nowrap transition-colors hover:bg-teal-900"
            >
              Apply My Household Profile
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
