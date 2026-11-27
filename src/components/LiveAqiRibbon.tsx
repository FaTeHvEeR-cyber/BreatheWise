import type { ReactElement } from 'react';
import { RefreshCw } from 'lucide-react';
import type { CityLocation, CpcbAqiResult, HouseholdProfile, LiveAirQualityData } from '../types';
import { formatReadingDateTime, formatRefreshDateTime } from '../utils/timeFormatting';

interface LiveAqiRibbonProps {
  readonly location: CityLocation;
  readonly liveData: LiveAirQualityData | null;
  readonly cpcb: CpcbAqiResult | null;
  readonly profile: HouseholdProfile;
  readonly hasHouseholdProfile: boolean;
  readonly protectionScorePct: number;
  readonly loading: boolean;
  readonly onRefresh: () => void;
}

/** Provenance banner showing live CPCB reading timestamp, city, and readiness score. */
export function LiveAqiRibbon({
  location,
  liveData,
  cpcb,
  profile,
  hasHouseholdProfile,
  protectionScorePct,
  loading,
  onRefresh,
}: LiveAqiRibbonProps): ReactElement {
  const reading = liveData ? formatReadingDateTime(liveData.readingIsoTime) : null;
  const refreshed = liveData
    ? formatRefreshDateTime(liveData.fetchedAtIso, location.timezone)
    : null;

  return (
    <section
      aria-label="Live air quality data provenance"
      className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="font-semibold text-slate-900">
          {location.name}
          {location.admin1 ? `, ${location.admin1}` : ''}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          ·
        </span>
        {cpcb ? (
          <span className={`font-mono font-semibold tabular-nums ${cpcb.category.textColorClass}`}>
            CPCB AQI {cpcb.aqi} ({cpcb.category.name})
          </span>
        ) : (
          <span className="font-mono text-slate-500">Computing CPCB AQI…</span>
        )}
        <span aria-hidden="true" className="text-slate-400">
          ·
        </span>
        <span>Source: {liveData?.sourceName ?? 'Open-Meteo Air Quality API'}</span>
        <span aria-hidden="true" className="text-slate-400">
          ·
        </span>
        <span className="font-mono tabular-nums">
          Reading:{' '}
          {reading ? (
            <span className="inline-flex items-baseline gap-2 text-slate-900">
              <span>{reading.dateLabel}</span>
              <span className="text-slate-600">{reading.timeLabel}</span>
            </span>
          ) : (
            'Fetching…'
          )}
        </span>
        {refreshed && (
          <>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span
              className="font-mono tabular-nums"
              title="Live telemetry refreshes automatically every 5 minutes"
            >
              Refreshed:{' '}
              <span className="inline-flex items-baseline gap-2 text-slate-900">
                <span>{refreshed.dateLabel}</span>
                <span className="text-slate-600">{refreshed.timeLabel}</span>
              </span>
            </span>
          </>
        )}
        {hasHouseholdProfile && profile.profileName.trim() && (
          <>
            <span aria-hidden="true" className="text-slate-400">
              ·
            </span>
            <span className="font-medium text-slate-800">Household: {profile.profileName}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="font-mono text-xs font-semibold text-teal-900 tabular-nums">
          Protection Score: {protectionScorePct}%
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh live Open-Meteo air quality data now"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-slate-950 disabled:opacity-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          {loading ? 'Refreshing…' : 'Refresh Live (5m auto)'}
        </button>
      </div>
    </section>
  );
}
