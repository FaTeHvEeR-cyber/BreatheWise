import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildPm25ChartData, computeAirQualityTrajectory } from './dataVisualization';
import { Pm25ForecastChart } from '../components/Pm25ForecastChart';
import type { HourlyForecastPoint } from '../types';

function buildSeries(values: number[]): HourlyForecastPoint[] {
  return values.map((pm2_5, idx) => ({
    isoTime: `2026-11-26T${String(idx).padStart(2, '0')}:00`,
    hourLabel: `${String(idx).padStart(2, '0')}:00`,
    pm2_5,
    pm10: pm2_5 * 1.4,
    us_aqi: Math.round(pm2_5 * 1.8),
    cpcbPm25SubIndex: Math.min(500, Math.round(pm2_5 * 2)),
  }));
}

test('buildPm25ChartData maps CPCB categories and ventilation verdicts deterministically', () => {
  const series = buildSeries([22.44, 52.0, 95.5]);
  const data = buildPm25ChartData(series);

  assert.equal(data.length, 3);
  assert.equal(data[0].pm2_5, 22.4);
  assert.equal(data[0].ventilationVerdict, 'Open Windows');
  assert.equal(data[1].ventilationVerdict, 'Brief Purge');
  assert.equal(data[2].ventilationVerdict, 'Keep Sealed');
});

test('computeAirQualityTrajectory detects improving, worsening, and steady trends', () => {
  const improving = computeAirQualityTrajectory(
    buildSeries([150, 145, 140, 130, 120, 110, 95, 80, 65, 55, 48, 42]),
  );
  assert.equal(improving.direction, 'Improving');
  assert.ok(improving.deltaUgM3 < 0);
  assert.equal(improving.minHourLabel, '11:00');

  const worsening = computeAirQualityTrajectory(
    buildSeries([30, 32, 35, 40, 50, 60, 75, 90, 105, 118, 125, 135]),
  );
  assert.equal(worsening.direction, 'Worsening');
  assert.ok(worsening.deltaUgM3 > 0);
  assert.equal(worsening.maxHourLabel, '11:00');

  const steadyHigh = computeAirQualityTrajectory(
    buildSeries([90, 92, 88, 91, 89, 90, 91, 89, 90, 92, 90, 88]),
  );
  assert.equal(steadyHigh.direction, 'Elevated & Steady');

  const cleanRise = computeAirQualityTrajectory(
    buildSeries([6, 7, 7, 8, 9, 10, 12, 14, 15, 16, 15, 14]),
  );
  assert.equal(cleanRise.direction, 'Low & Steady');

  const empty = computeAirQualityTrajectory([]);
  assert.equal(empty.avgPm25, 0);
});

test('Pm25ForecastChart renders empty state and 24h forecast with bestWindow', () => {
  const emptyHtml = renderToStaticMarkup(
    createElement(Pm25ForecastChart, { hourly24h: [], bestWindow: null }),
  );
  assert.ok(emptyHtml.includes('No 24-hour PM2.5 forecast series returned.'));

  const series = buildSeries([120, 80, 45, 25, 30, 95]);
  const chartHtml = renderToStaticMarkup(
    createElement(Pm25ForecastChart, {
      hourly24h: series,
      bestWindow: {
        startHourLabel: '03:00',
        endHourLabel: '05:00',
        startIndex: 3,
        endIndex: 5,
        avgPm25: 50,
        peakPm25: 95,
        minPm25: 25,
        verdict: 'Brief Purge',
      },
    }),
  );
  assert.ok(chartHtml.includes('24-Hour Outdoor PM2.5 Forecast Trajectory'));
  assert.ok(chartHtml.includes('03:00'));
});
