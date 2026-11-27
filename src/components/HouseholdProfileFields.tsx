import type { ReactElement } from 'react';
import type { CommuteMode, CookingFuel, HouseholdProfile } from '../types';
import {
  COMMUTE_OPTIONS,
  FUEL_OPTIONS,
  MAX_COMMUTE_KM,
  MAX_ROOMS,
} from '../data/breatheWisePresets';
import { IntegerInputField } from './IntegerInputField';

interface HouseholdProfileFieldsProps {
  readonly draft: HouseholdProfile;
  readonly commuteInput: string;
  readonly roomsInput: string;
  readonly onChangeDraft: (patch: Partial<HouseholdProfile>) => void;
  readonly onSyncSetup: (patch: Partial<HouseholdProfile>) => void;
  readonly onChangeCommuteText: (val: string) => void;
  readonly onChangeRoomsText: (val: string) => void;
}

/** Text, commute, fuel, and room inputs for the custom household profile form. */
export function HouseholdProfileFields({
  draft,
  commuteInput,
  roomsInput,
  onChangeDraft,
  onSyncSetup,
  onChangeCommuteText,
  onChangeRoomsText,
}: HouseholdProfileFieldsProps): ReactElement {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="custom-household-name"
            className="block text-xs font-medium text-slate-700"
          >
            Household Label
          </label>
          <input
            id="custom-household-name"
            type="text"
            value={draft.profileName}
            onChange={(e) => onChangeDraft({ profileName: e.target.value })}
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
            onChange={(e) => onChangeDraft({ vulnerableMembers: e.target.value })}
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
            onChange={(e) => onChangeDraft({ personaSummary: e.target.value })}
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
            onChange={(e) => onSyncSetup({ commuteMode: e.target.value as CommuteMode })}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
          >
            {COMMUTE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
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
          onChangeText={onChangeCommuteText}
          onCommitNumber={(km) => onSyncSetup({ commuteDistanceKm: km })}
        />

        <div>
          <label htmlFor="custom-fuel" className="block text-xs font-medium text-slate-700">
            Cooking Fuel
          </label>
          <select
            id="custom-fuel"
            value={draft.cookingFuel}
            onChange={(e) => onSyncSetup({ cookingFuel: e.target.value as CookingFuel })}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
          >
            {FUEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
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
          onChangeText={onChangeRoomsText}
          onCommitNumber={(count) => onSyncSetup({ roomCount: count })}
        />
      </div>
    </>
  );
}
