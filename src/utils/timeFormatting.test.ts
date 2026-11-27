import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULT_AUTO_REFRESH_MS,
  formatHour12,
  formatReadingDateTime,
  formatRefreshDateTime,
  shouldAutoRefresh,
} from './timeFormatting';

test('formatHour12 converts 24-hour ISO and HH:MM strings into standard 12-hour AM/PM labels', () => {
  assert.equal(formatHour12('2026-11-27T00:00'), '12 AM');
  assert.equal(formatHour12('2026-11-27T02:00'), '2 AM');
  assert.equal(formatHour12('2026-11-27T12:00'), '12 PM');
  assert.equal(formatHour12('2026-11-27T14:00'), '2 PM');
  assert.equal(formatHour12('2026-11-27T17:00'), '5 PM');
  assert.equal(formatHour12('2026-11-27T23:00'), '11 PM');
  assert.equal(formatHour12('15:30'), '3:30 PM');
});

test('formatReadingDateTime splits ISO date and time with readable 12h clock and gap', () => {
  const midnight = formatReadingDateTime('2026-11-27T00:30');
  assert.equal(midnight.dateLabel, '27 Nov 2026');
  assert.equal(midnight.timeLabel, '12:30 AM');
  assert.equal(midnight.combined, '27 Nov 2026  12:30 AM');

  const afternoon = formatReadingDateTime('2026-11-27T15:45');
  assert.equal(afternoon.dateLabel, '27 Nov 2026');
  assert.equal(afternoon.timeLabel, '3:45 PM');
});

test('formatRefreshDateTime converts UTC ISO refresh instant into IST date and time with gap', () => {
  // 2026-11-26T19:00:15Z is 2026-11-27 00:30:15 IST (UTC+5:30)
  const formatted = formatRefreshDateTime('2026-11-26T19:00:15.000Z', 'Asia/Kolkata');
  assert.equal(formatted.dateLabel, '27 Nov 2026');
  assert.equal(formatted.timeLabel, '12:30:15 AM');
  assert.equal(formatted.combined, '27 Nov 2026  12:30:15 AM');
});

test('shouldAutoRefresh triggers only once 5 minutes have elapsed since last fetch', () => {
  assert.equal(DEFAULT_AUTO_REFRESH_MS, 300_000);
  const t0 = 1_700_000_000_000;
  assert.equal(shouldAutoRefresh(null, t0), false);
  assert.equal(shouldAutoRefresh(t0, t0 + 299_999), false);
  assert.equal(shouldAutoRefresh(t0, t0 + 300_000), true);
  assert.equal(shouldAutoRefresh(t0, t0 + 600_000), true);
});

test('timeFormatting falls back cleanly on unparseable strings, invalid dates, and bad timezones', () => {
  assert.equal(formatHour12('not-a-time'), 'not-a-time');
  assert.deepEqual(formatReadingDateTime('2026/invalid'), {
    dateLabel: '2026/invalid',
    timeLabel: '',
    combined: '2026/invalid',
  });
  assert.deepEqual(formatRefreshDateTime('not-a-date', 'Asia/Kolkata'), {
    dateLabel: 'not-a-date',
    timeLabel: '',
    combined: 'not-a-date',
  });

  const badTz = formatRefreshDateTime('2026-11-27T08:15:00Z', 'Mars/Olympus');
  assert.equal(badTz.dateLabel, '27 Nov 2026');
  assert.equal(badTz.timeLabel, '8:15 AM');
});
