import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePartialClarifyingQuestions,
  parseSseChunk,
} from './streamingQuestionsParser';

test('parsePartialClarifyingQuestions returns null for empty or key-only buffer', () => {
  assert.equal(parsePartialClarifyingQuestions(''), null);
  assert.equal(parsePartialClarifyingQuestions('{"airContextNote":'), null);
});

test('parsePartialClarifyingQuestions streams airContextNote incrementally with escapes', () => {
  const partial = '{"airContextNote": "Delhi live CPCB AQI is 312 (\\"Very Poor\\") — PM2.5';
  const parsed = parsePartialClarifyingQuestions(partial);
  assert.ok(parsed);
  assert.equal(parsed.airContextNote, 'Delhi live CPCB AQI is 312 ("Very Poor") — PM2.5');
  assert.equal(parsed.questions.length, 0);
});

test('parsePartialClarifyingQuestions yields completed questions while next question streams', () => {
  const partial =
    '{"airContextNote":"AQI 312 in Delhi.","questions":[{"id":"q1","question":"Using an air purifier today?","reason":"Sets indoor PM2.5 target.","quickOptions":["HEPA on","No purifier","DIY box fan"]},{"id":"q2","question":"Commute mode';
  const parsed = parsePartialClarifyingQuestions(partial);
  assert.ok(parsed);
  assert.equal(parsed.airContextNote, 'AQI 312 in Delhi.');
  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.questions[0].id, 'q1');
  assert.deepEqual(parsed.questions[0].quickOptions, ['HEPA on', 'No purifier', 'DIY box fan']);
});

test('parsePartialClarifyingQuestions handles full valid JSON response', () => {
  const full = JSON.stringify({
    airContextNote: 'Noida live CPCB AQI is 284 (Poor), led by PM2.5.',
    questions: [
      { id: 'q1', question: 'Q1?', reason: 'R1', quickOptions: ['A', 'B', 'C'] },
      { id: 'q2', question: 'Q2?', reason: 'R2', quickOptions: ['D', 'E', 'F'] },
      { id: 'q3', question: 'Q3?', reason: 'R3', quickOptions: ['G', 'H', 'I'] },
    ],
  });
  const parsed = parsePartialClarifyingQuestions(full);
  assert.ok(parsed);
  assert.equal(parsed.questions.length, 3);
  assert.equal(parsed.sourceMode, 'gemini');
});

test('parseSseChunk handles split frames across chunks', () => {
  const first = parseSseChunk('', 'event: chunk\ndata: {"delta":"hel');
  assert.equal(first.events.length, 0);
  assert.ok(first.carry.includes('event: chunk'));

  const second = parseSseChunk(first.carry, 'lo"}\n\nevent: done\ndata: {"ok":true}\n\n');
  assert.equal(second.events.length, 2);
  assert.equal(second.events[0].event, 'chunk');
  assert.equal(second.events[0].data, '{"delta":"hello"}');
  assert.equal(second.events[1].event, 'done');
  assert.equal(second.carry, '');
});

test('buildClarifyingQuestionsPayload stays compact and omits household when unselected', async () => {
  const { buildClarifyingQuestionsPayload } = await import('./aiPayloads');
  const { computeCpcbAqi } = await import('./cpcbAqi');
  const current = { pm2_5: 145, pm10: 240, nitrogen_dioxide: 42, ozone: 28, sulphur_dioxide: 12, us_aqi: 198 };
  const cpcb = computeCpcbAqi(current);
  const liveData = {
    location: { id: 'delhi', name: 'Delhi', country: 'India', latitude: 28.6, longitude: 77.2, timezone: 'Asia/Kolkata' },
    sourceName: 'Open-Meteo Air Quality API' as const,
    sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    readingIsoTime: '2026-11-26T12:00',
    fetchedAtIso: '2026-11-26T12:00:00Z',
    current,
    hourly24h: [],
  };
  const profile = {
    profileName: 'Delhi Commuter',
    personaSummary: 'Commuter',
    commuteDistanceKm: 20,
    commuteMode: 'metro' as const,
    cookingFuel: 'png_gas' as const,
    hasPurifier: true,
    hasKitchenExhaust: true,
    hasCrossVentilation: false,
    roomCount: 2,
    vulnerableMembers: 'None',
  };

  const noProfilePayload = buildClarifyingQuestionsPayload(liveData, cpcb, profile, false, null);
  assert.equal('household' in noProfilePayload, false);
  assert.equal('notes' in noProfilePayload, false);
  assert.equal(noProfilePayload.city, 'Delhi');

  const withProfilePayload = buildClarifyingQuestionsPayload(liveData, cpcb, profile, true, 'asthma');
  assert.equal(typeof withProfilePayload.household, 'string');
  assert.equal(withProfilePayload.notes, 'asthma');
});
