import { useCallback, useEffect, useRef, useState } from 'react';
import type { CityLocation, LiveAirQualityData } from '../types';
import { fetchLiveCityAirQuality } from '../services/aqiService';
import { DEFAULT_AUTO_REFRESH_MS, shouldAutoRefresh } from '../utils/timeFormatting';

export interface UseLiveAqiTelemetryReturn {
  readonly liveData: LiveAirQualityData | null;
  readonly aqiLoading: boolean;
  readonly aqiError: string | null;
  readonly refreshAqi: () => void;
}

/** Fetches live Open-Meteo AQI telemetry for a city and auto-refreshes every 5 minutes. */
export function useLiveAqiTelemetry(location: CityLocation): UseLiveAqiTelemetryReturn {
  const [liveData, setLiveData] = useState<LiveAirQualityData | null>(null);
  const [aqiLoading, setAqiLoading] = useState<boolean>(true);
  const [aqiError, setAqiError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedAtMsRef = useRef<number | null>(null);

  const refreshAqi = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    isFetchingRef.current = true;
    setLiveData((prev) => (prev && prev.location.id === location.id ? prev : null));
    setAqiLoading(true);
    setAqiError(null);

    fetchLiveCityAirQuality(location, controller.signal)
      .then((fetched) => {
        if (!controller.signal.aborted) {
          isFetchingRef.current = false;
          lastFetchedAtMsRef.current = Date.now();
          setLiveData(fetched);
          setAqiLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        isFetchingRef.current = false;
        setAqiError(err instanceof Error ? err.message : 'Unable to load Open-Meteo telemetry.');
        setAqiLoading(false);
      });

    return () => {
      isFetchingRef.current = false;
      controller.abort();
    };
  }, [location, refreshTick]);

  // Automatic 5-minute interval timer + stale-tab wakeup refresh without wiping current UI
  useEffect(() => {
    const triggerAutoRefresh = () => {
      if (!isFetchingRef.current) {
        refreshAqi();
      }
    };

    const intervalId = window.setInterval(triggerAutoRefresh, DEFAULT_AUTO_REFRESH_MS);

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        shouldAutoRefresh(lastFetchedAtMsRef.current, Date.now(), DEFAULT_AUTO_REFRESH_MS)
      ) {
        triggerAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location, refreshAqi]);

  return { liveData, aqiLoading, aqiError, refreshAqi };
}
