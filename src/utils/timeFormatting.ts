import { DEFAULT_AUTO_REFRESH_MS } from '../config/constants';

export { DEFAULT_AUTO_REFRESH_MS };

export interface FormattedDateTime {
  dateLabel: string;
  timeLabel: string;
  combined: string;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function format12Hour(hours24: number, minutes: number, seconds?: number): string {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mm = String(minutes).padStart(2, '0');
  if (typeof seconds === 'number') {
    const ss = String(seconds).padStart(2, '0');
    return `${h12}:${mm}:${ss} ${period}`;
  }
  return `${h12}:${mm} ${period}`;
}

/**
 * Converts an ISO timestamp ("2026-11-27T14:00") or 24-hour clock string ("14:00")
 * into standard 12-hour clock format ("2 PM" when on the hour, or "2:30 PM").
 */
export function formatHour12(isoOrTime: string): string {
  const trimmed = isoOrTime.trim();
  const timePart = trimmed.includes('T') ? (trimmed.split('T')[1] ?? '') : trimmed;
  const match = /^(\d{1,2}):(\d{2})/.exec(timePart);
  if (!match) {
    return trimmed;
  }
  const hour24 = Number(match[1]) % 24;
  const minutes = Number(match[2]);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  if (minutes === 0) {
    return `${h12} ${period}`;
  }
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Formats an Open-Meteo local ISO timestamp like "2026-11-27T00:30"
 * into distinct date and 12-hour time strings with a clean gap.
 */
export function formatReadingDateTime(isoString: string): FormattedDateTime {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(isoString.trim());
  if (!match) {
    return { dateLabel: isoString, timeLabel: '', combined: isoString };
  }
  const year = match[1];
  const monthIdx = Number(match[2]) - 1;
  const day = String(Number(match[3])).padStart(2, '0');
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const monthName = MONTHS_SHORT[monthIdx] ?? match[2];

  const dateLabel = `${day} ${monthName} ${year}`;
  const timeLabel = format12Hour(hour, minute);
  return {
    dateLabel,
    timeLabel,
    combined: `${dateLabel}  ${timeLabel}`,
  };
}

/**
 * Formats an absolute UTC ISO instant (e.g. last API refresh time) into
 * the city's local date and time concatenated with a clean visual gap.
 */
export function formatRefreshDateTime(
  utcIsoString: string,
  timezone = 'Asia/Kolkata',
): FormattedDateTime {
  const date = new Date(utcIsoString);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: utcIsoString, timeLabel: '', combined: utcIsoString };
  }

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const dateLabel = `${get('day')} ${get('month')} ${get('year')}`;
    const rawHour = Number(get('hour')) % 24;
    const rawMin = Number(get('minute'));
    const rawSec = Number(get('second'));
    const timeLabel = format12Hour(rawHour, rawMin, rawSec);

    return {
      dateLabel,
      timeLabel,
      combined: `${dateLabel}  ${timeLabel}`,
    };
  } catch {
    return formatReadingDateTime(utcIsoString);
  }
}

/** Returns true when at least intervalMs has elapsed since the last telemetry fetch. */
export function shouldAutoRefresh(
  lastFetchedAtMs: number | null,
  nowMs: number,
  intervalMs: number = DEFAULT_AUTO_REFRESH_MS,
): boolean {
  if (lastFetchedAtMs === null) {
    return false;
  }
  return nowMs - lastFetchedAtMs >= intervalMs;
}
