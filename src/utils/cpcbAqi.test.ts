import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  calculatePollutantSubIndex,
  computeCpcbAqi,
  getAqiScalePercent,
  getCpcbCategoryName,
  getCpcbScaleSegments,
} from './cpcbAqi';

test('PM2.5 CPCB sub-index matches official boundary breakpoints', () => {
  assert.equal(calculatePollutantSubIndex('pm2_5', 0), 0);
  assert.equal(calculatePollutantSubIndex('pm2_5', 30), 50);
  assert.equal(calculatePollutantSubIndex('pm2_5', 60), 100);
  assert.equal(calculatePollutantSubIndex('pm2_5', 90), 200);
  assert.equal(calculatePollutantSubIndex('pm2_5', 120), 300);
  assert.equal(calculatePollutantSubIndex('pm2_5', 250), 400);
  assert.equal(calculatePollutantSubIndex('pm2_5', 420), 500);
});

test('PM2.5 linear interpolation computes mid-band values accurately', () => {
  // Midpoint of 60..90 -> 101..200 is 150.5 -> 151
  assert.equal(calculatePollutantSubIndex('pm2_5', 75), 151);
  // Midpoint of 0..30 -> 0..50 is 25
  assert.equal(calculatePollutantSubIndex('pm2_5', 15), 25);
});

test('overall CPCB AQI picks maximum sub-index and dominant pollutant', () => {
  const result = computeCpcbAqi({
    pm2_5: 45, // sub-index ~76
    pm10: 275, // sub-index ~226 (dominant)
    nitrogen_dioxide: 30,
    ozone: 40,
    sulphur_dioxide: 12,
    us_aqi: 120,
  });

  assert.equal(result.aqi, 226);
  assert.equal(result.category.name, 'Poor');
  assert.equal(result.dominantPollutant?.symbol, 'PM10');
});

test('handles null pollutants and maps all 6 CPCB categories', () => {
  assert.equal(calculatePollutantSubIndex('ozone', null), null);
  assert.equal(getCpcbCategoryName(42), 'Good');
  assert.equal(getCpcbCategoryName(85), 'Satisfactory');
  assert.equal(getCpcbCategoryName(160), 'Moderate');
  assert.equal(getCpcbCategoryName(250), 'Poor');
  assert.equal(getCpcbCategoryName(340), 'Very Poor');
  assert.equal(getCpcbCategoryName(450), 'Severe');
});

test('linear CPCB scale segments reflect exact 0-500 band widths and place AQI 342 inside Very Poor', () => {
  const segments = getCpcbScaleSegments();
  assert.deepEqual(
    segments.map((s) => s.widthPercent),
    [10, 10, 20, 20, 20, 20],
  );
  const totalWidth = segments.reduce((sum, s) => sum + s.widthPercent, 0);
  assert.equal(totalWidth, 100);

  const pos342 = getAqiScalePercent(342);
  assert.equal(pos342, 68.4);
  const veryPoor = segments.find((s) => s.category.name === 'Very Poor');
  assert.ok(veryPoor);
  assert.equal(veryPoor.startPercent, 60);
  assert.ok(pos342 > veryPoor.startPercent && pos342 < veryPoor.startPercent + veryPoor.widthPercent);
});
