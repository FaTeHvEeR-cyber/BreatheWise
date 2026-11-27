import type { WorkspaceId } from '../types.js';

/** Ordered navigation tabs for the five BreatheWise workspaces. */
export const WORKSPACE_TABS: ReadonlyArray<{ id: WorkspaceId; label: string }> = [
  { id: 'intake', label: 'Intake' },
  { id: 'routine', label: 'Routine' },
  { id: 'indoor', label: 'Indoor Lab' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'community', label: 'Community' },
] as const;

/**
 * Centralized application, API, telemetry, and CPCB AQI constants.
 */
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const PER_ATTEMPT_TIMEOUT_MS = 20_000;
export const MAX_API_BODY_BYTES = 128 * 1024;

export const PLACEHOLDER_GEMINI_KEYS: ReadonlySet<string> = new Set([
  'your_google_ai_studio_api_key_here',
  'MY_GEMINI_API_KEY',
]);

export const CPCB_AQI_MIN = 0;
export const CPCB_AQI_MAX = 500;
export const PM25_SAFE_VENTILATION_LIMIT = 35;
export const PM25_BRIEF_PURGE_LIMIT = 65;
export const PM25_CPCB_MODERATE_LIMIT = 60;

export const DEFAULT_AUTO_REFRESH_MS = 5 * 60 * 1000;
export const MAX_COMMUTE_KM = 200;
export const MAX_ROOMS = 20;
