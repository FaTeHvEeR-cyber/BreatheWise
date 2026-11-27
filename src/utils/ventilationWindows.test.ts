import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeVentilationWindows,
  classifyVentilationHour,
} from './ventilationWindows';
import type { HourlyForecastPoint } from '../types';

function makeHourlySeries(values: number[]): HourlyForecastPoint[] {
  return values.map((pm2_5, idx) => ({
    isoTime: `2026-11-25T${String(idx).padStart(2, '0')}:00`,
    hourLabel: `${String(idx).padStart(2, '0')}:00`,
    pm2_5,
    pm10: pm2_5 * 1.6,
    us_aqi: Math.round(pm2_5 * 2),
    cpcbPm25SubIndex: Math.round(pm2_5 * 1.5),
  }));
}

test('identifies lowest 3-hour ventilation window and peak danger window', () => {
  const series = makeHourlySeries([120, 110, 95, 40, 28, 25, 30, 80, 140, 160, 155, 130]);
  const analysis = analyzeVentilationWindows(series, 110, 3);

  assert.ok(analysis.bestWindow);
  assert.equal(analysis.bestWindow.startHourLabel, '04:00');
  assert.equal(analysis.bestWindow.endHourLabel, '06:00');
  assert.equal(analysis.bestWindow.verdict, 'Open Windows');

  assert.ok(analysis.worstWindow);
  assert.equal(analysis.worstWindow.startHourLabel, '08:00');
  assert.equal(analysis.worstWindow.endHourLabel, '10:00');
  assert.equal(analysis.worstWindow.verdict, 'Keep Sealed');
  assert.equal(analysis.safeHourCount, 3);
  assert.equal(analysis.sealedHourCount, 8);
});

test('classifies ventilation thresholds deterministically', () => {
  assert.equal(classifyVentilationHour(20), 'Open Windows');
  assert.equal(classifyVentilationHour(50), 'Brief Purge');
  assert.equal(classifyVentilationHour(90), 'Keep Sealed');
});
