import { useEffect, useRef, useState } from 'react';
import type { CommuteMode, CookingFuel, HouseholdProfile } from '../types';
import {
  COMMUTE_OPTIONS,
  FUEL_OPTIONS,
  MAX_COMMUTE_KM,
  MAX_ROOMS,
} from '../data/breatheWisePresets';
import { clampActiveRooms, finalizeIntegerInput } from '../utils/numericInput';
import { IntegerInputField } from './IntegerInputField';

interface CustomHouseholdSectionProps {
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  onSyncSetup: (patch: Partial<HouseholdProfile>) => void;
  onSaveCustomProfile: (custom: HouseholdProfile) => void;
  onClearHousehold: () => void;
}

export function CustomHouseholdSection({
  profile, hasHouseholdProfile, onSyncSetup, onSaveCustomProfile, onClearHousehold,
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
    <section aria-label="Specify your own household profile" className="border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your Individual Household Profile</h2>
          <p className="text-xs text-slate-600">
            Specify your own home setup, commute, and family sensitivities—or customize any verified scenario above. Shared indoor options auto-fill in the Indoor Lab.
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="custom-household-name" className="block text-xs font-medium text-slate-700">
              Household Label
            </label>
            <input
              id="custom-household-name"
              type="text"
              value={draft.profileName}
              onChange={(e) => setDraft((d) => ({ ...d, profileName: e.target.value }))}
              placeholder="e.g., My 2BHK Family in Indirapuram"
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="custom-vulnerable" className="block text-xs font-medium text-slate-700">
              Family Members &amp; Health Sensitivities
            </label>
            <input
              id="custom-vulnerable"
              type="text"
              value={draft.vulnerableMembers}
              onChange={(e) => setDraft((d) => ({ ...d, vulnerableMembers: e.target.value }))}
              placeholder="e.g., 2 adults, school-going child, elderly parent with asthma"
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="custom-summary" className="block text-xs font-medium text-slate-700">
              Household Routine Summary / Context
            </label>
            <input
              id="custom-summary"
              type="text"
              value={draft.personaSummary}
              onChange={(e) => setDraft((d) => ({ ...d, personaSummary: e.target.value }))}
              placeholder="e.g., 3rd-floor apartment near main road, morning school bus drop at 7:45 AM, evening walk habit"
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="custom-commute-mode" className="block text-xs font-medium text-slate-700">
              Primary Commute
            </label>
            <select
              id="custom-commute-mode"
              value={draft.commuteMode}
              onChange={(e) => updateAndSync({ commuteMode: e.target.value as CommuteMode })}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              {COMMUTE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <IntegerInputField
            id="custom-commute-km"
            label="Daily Commute (km)"
            value={commuteInput}
            min={0}
            max={MAX_COMMUTE_KM}
            fallback={0}
            onChangeText={setCommuteInput}
            onCommitNumber={(km) => updateAndSync({ commuteDistanceKm: km })}
          />

          <div>
            <label htmlFor="custom-fuel" className="block text-xs font-medium text-slate-700">
              Cooking Fuel
            </label>
            <select
              id="custom-fuel"
              value={draft.cookingFuel}
              onChange={(e) => updateAndSync({ cookingFuel: e.target.value as CookingFuel })}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              {FUEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          <IntegerInputField
            id="custom-rooms"
            label="Active Rooms"
            value={roomsInput}
            min={1}
            max={MAX_ROOMS}
            fallback={1}
            infoTooltip="Active Rooms are the rooms in your house that are regularly used or accessed by household members (such as bedrooms, living areas, and study rooms)."
            infoTooltipAlign="right"
            onChangeText={setRoomsInput}
            onCommitNumber={(count) => updateAndSync({ roomCount: count })}
          />
        </div>

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
