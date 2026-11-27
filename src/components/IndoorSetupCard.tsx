import type { HouseholdProfile } from '../types';
import { FUEL_OPTIONS } from '../data/breatheWisePresets';
import { clampActiveRooms } from '../utils/numericInput';
import { InfoTooltip } from './InfoTooltip';

interface IndoorSetupCardProps {
  profile: HouseholdProfile;
  hasHouseholdProfile: boolean;
  onUpdateProfile: (patch: Partial<HouseholdProfile>) => void;
}

export function IndoorSetupCard({
  profile,
  hasHouseholdProfile,
  onUpdateProfile,
}: IndoorSetupCardProps) {
  const totalRooms = Math.max(1, profile.roomCount);
  const activeRooms = clampActiveRooms(profile.activeRoomCount, totalRooms);

  return (
    <div className="border border-slate-200 bg-white p-6 lg:col-span-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">
          Home Air-Quality Setup &amp; Budget Mode
        </h2>
        <span className="font-mono text-[11px] font-medium text-teal-900">
          {hasHouseholdProfile && profile.profileName
            ? `Auto-filled from ${profile.profileName}`
            : 'Synced with Household Profile'}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Options filled in your Household Profile are auto-filled below. Toggle any control to adapt
        the deterministic PM2.5 meter and Gemini room protocol immediately.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-700">Filtration Mode</p>
          <div
            className="mt-2 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Air filtration mode"
          >
            <button
              type="button"
              aria-pressed={profile.hasPurifier}
              onClick={() => onUpdateProfile({ hasPurifier: true })}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                profile.hasPurifier
                  ? 'border-teal-800 bg-teal-800 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              HEPA Purifier
            </button>
            <button
              type="button"
              aria-pressed={!profile.hasPurifier}
              onClick={() => onUpdateProfile({ hasPurifier: false })}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                !profile.hasPurifier
                  ? 'border-teal-800 bg-teal-800 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              Budget DIY / Zero
            </button>
          </div>
        </div>

        <div className="border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-700">Primary Cooking Fuel</p>
          <div
            className="mt-2 grid grid-cols-3 gap-1.5"
            role="group"
            aria-label="Cooking fuel type"
          >
            {FUEL_OPTIONS.map((fuel) => {
              const selected = profile.cookingFuel === fuel.id;
              return (
                <button
                  key={fuel.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onUpdateProfile({ cookingFuel: fuel.id })}
                  className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-teal-800 bg-teal-800 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {fuel.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between border border-slate-200 p-4">
          <span className="text-xs font-medium text-slate-800">
            Active Kitchen Chimney / Exhaust
          </span>
          <input
            type="checkbox"
            checked={profile.hasKitchenExhaust}
            onChange={(e) => onUpdateProfile({ hasKitchenExhaust: e.target.checked })}
            className="h-4 w-4 accent-teal-800"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between border border-slate-200 p-4">
          <span className="text-xs font-medium text-slate-800">Cross-Ventilation Windows</span>
          <input
            type="checkbox"
            checked={profile.hasCrossVentilation}
            onChange={(e) => onUpdateProfile({ hasCrossVentilation: e.target.checked })}
            className="h-4 w-4 accent-teal-800"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200 p-4">
        <div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="indoor-room-count" className="text-xs font-medium text-slate-800">
              Active Rooms:{' '}
              <span className="font-mono font-semibold text-teal-900 tabular-nums">
                {activeRooms} of {totalRooms} {totalRooms === 1 ? 'Room / PG' : 'Rooms'}
              </span>
            </label>
            <InfoTooltip
              label="More information about Active Rooms"
              content="Active Rooms are the rooms in your house that are regularly used or accessed by household members (such as bedrooms, living areas, and study rooms)."
              align="left"
            />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-600">
            Capped at {totalRooms} total {totalRooms === 1 ? 'room' : 'rooms'} specified in House
            Details.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 tabular-nums">
          <span>1</span>
          <input
            id="indoor-room-count"
            type="range"
            min={1}
            max={totalRooms}
            step={1}
            disabled={totalRooms <= 1}
            value={activeRooms}
            onChange={(e) =>
              onUpdateProfile({
                activeRoomCount: clampActiveRooms(Number(e.target.value), totalRooms),
              })
            }
            className="w-36 accent-teal-800 disabled:opacity-50"
          />
          <span>{totalRooms}</span>
        </div>
      </div>
    </div>
  );
}
