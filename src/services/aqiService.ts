import type {
  CityLocation,
  HourlyForecastPoint,
  LiveAirQualityData,
  RawPollutantReadings,
} from '../types';
import { OPEN_METEO_AIR_QUALITY_URL, OPEN_METEO_GEOCODING_URL } from '../config/constants';
import { calculatePollutantSubIndex } from '../utils/cpcbAqi';
import { formatHour12 } from '../utils/timeFormatting';

interface OpenMeteoGeocodingResult {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

interface OpenMeteoAirQualityResponse {
  current?: {
    time?: string;
    pm2_5?: number | null;
    pm10?: number | null;
    nitrogen_dioxide?: number | null;
    ozone?: number | null;
    sulphur_dioxide?: number | null;
    us_aqi?: number | null;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

function formatHourLabel(isoString: string): string {
  return formatHour12(isoString);
}

function toFiniteOrNull(val: number | null | undefined): number | null {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

/** Searches Indian and global cities via Open-Meteo Geocoding API, prioritizing India. */
export async function searchIndianAndGlobalCities(
  query: string,
  signal?: AbortSignal,
): Promise<CityLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const params = new URLSearchParams({
    name: trimmed,
    count: '8',
    language: 'en',
    format: 'json',
  });

  const url = `${OPEN_METEO_GEOCODING_URL}?${params.toString()}`;
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Open-Meteo Geocoding returned HTTP ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse;
  const rows = data.results ?? [];

  // Prioritize Indian cities first while preserving global matches
  const sorted = [...rows].sort((a, b) => {
    const aIn = a.country_code === 'IN' ? 0 : 1;
    const bIn = b.country_code === 'IN' ? 0 : 1;
    return aIn - bIn;
  });

  return sorted.slice(0, 6).map((row) => ({
    id: `geo-${row.id}`,
    name: row.name,
    admin1: row.admin1,
    country: row.country ?? 'Unknown',
    latitude: Number(row.latitude.toFixed(4)),
    longitude: Number(row.longitude.toFixed(4)),
    timezone: row.timezone ?? 'Asia/Kolkata',
  }));
}

/** Fetches live pollutant readings and 24-hour PM2.5 forecast from Open-Meteo. */
export async function fetchLiveCityAirQuality(
  location: CityLocation,
  signal?: AbortSignal,
): Promise<LiveAirQualityData> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,us_aqi',
    hourly: 'pm2_5,pm10,us_aqi',
    forecast_hours: '24',
    timezone: location.timezone || 'Asia/Kolkata',
  });

  const sourceUrl = `${OPEN_METEO_AIR_QUALITY_URL}?${params.toString()}`;
  const response = await fetch(sourceUrl, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Open-Meteo Air Quality API returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OpenMeteoAirQualityResponse;
  const fetchedAtIso = new Date().toISOString();

  const current: RawPollutantReadings = {
    pm2_5: toFiniteOrNull(payload.current?.pm2_5),
    pm10: toFiniteOrNull(payload.current?.pm10),
    nitrogen_dioxide: toFiniteOrNull(payload.current?.nitrogen_dioxide),
    ozone: toFiniteOrNull(payload.current?.ozone),
    sulphur_dioxide: toFiniteOrNull(payload.current?.sulphur_dioxide),
    us_aqi: toFiniteOrNull(payload.current?.us_aqi),
  };

  const times = payload.hourly?.time ?? [];
  const pm25Series = payload.hourly?.pm2_5 ?? [];
  const pm10Series = payload.hourly?.pm10 ?? [];
  const usAqiSeries = payload.hourly?.us_aqi ?? [];

  const hourly24h: HourlyForecastPoint[] = [];
  const limit = Math.min(24, times.length);
  for (let i = 0; i < limit; i += 1) {
    const pm25Val = toFiniteOrNull(pm25Series[i]);
    if (pm25Val === null) continue;
    hourly24h.push({
      isoTime: times[i],
      hourLabel: formatHourLabel(times[i]),
      pm2_5: Number(pm25Val.toFixed(1)),
      pm10: toFiniteOrNull(pm10Series[i]),
      us_aqi: toFiniteOrNull(usAqiSeries[i]),
      cpcbPm25SubIndex: calculatePollutantSubIndex('pm2_5', pm25Val) ?? 0,
    });
  }

  return {
    location,
    sourceName: 'Open-Meteo Air Quality API',
    sourceUrl,
    readingIsoTime: payload.current?.time ?? fetchedAtIso,
    fetchedAtIso,
    current,
    hourly24h,
  };
}
