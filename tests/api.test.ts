import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponseLike } from '../src/services/aiController';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', async () => {
  const actual = await vi.importActual<typeof import('@google/genai')>('@google/genai');
  return {
    ...actual,
    GoogleGenAI: vi.fn(() => ({
      models: { generateContent: mockGenerateContent, generateContentStream: mockGenerateContentStream },
    })),
  };
});

import healthHandler from '../api/health';
import questionsHandler from '../api/gemini/questions';
import streamHandler from '../api/gemini/questions/stream';
import routineHandler from '../api/gemini/routine';
import indoorHandler from '../api/gemini/indoor';
import shockHandler from '../api/gemini/shock';
import communityHandler from '../api/gemini/community';

interface MockRes extends ApiResponseLike {
  statusCode: number;
  headers: Record<string, string | string[]>;
  jsonBody: unknown;
  chunks: string[];
}

function createMockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    jsonBody: undefined,
    chunks: [],
    writableEnded: false,
    setHeader(name: string, value: string | string[]) {
      res.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.jsonBody = payload;
      res.writableEnded = true;
    },
    write(chunk: string) {
      res.chunks.push(chunk);
      return true;
    },
    end() {
      res.writableEnded = true;
    },
    flushHeaders() {},
  };
  return res;
}

const VALID_PROFILE = {
  profileName: 'Delhi Commuter', personaSummary: 'Apartment flat', commuteDistanceKm: 18,
  commuteMode: 'metro' as const, cookingFuel: 'png_gas' as const, hasPurifier: true,
  hasKitchenExhaust: true, hasCrossVentilation: true, roomCount: 2, activeRoomCount: 2, vulnerableMembers: 'None',
};

const VALID_QUESTIONS_REQ = {
  city: 'Delhi', aqi: 280, category: 'Poor', dominant: 'PM2.5', pm25: 112, hasHouseholdProfile: true,
};

describe('Vercel API routes & Zod trust boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-secret-api-key-12345';
    delete process.env.GEMINI_MODEL;
  });

  it('handles /api/health GET and rejects POST with 405', () => {
    const res = createMockRes();
    healthHandler({ method: 'GET', headers: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect((res.jsonBody as { status: string }).status).toBe('ok');

    const badRes = createMockRes();
    healthHandler({ method: 'POST', headers: {} }, badRes);
    expect(badRes.statusCode).toBe(405);
    expect(badRes.headers.allow).toBe('GET');
  });

  it('rejects non-POST with 405 + Allow: POST and non-JSON with 415', async () => {
    const res405 = createMockRes();
    await questionsHandler({ method: 'GET', headers: {} }, res405);
    expect(res405.statusCode).toBe(405);
    expect(res405.headers.allow).toBe('POST');
    expect(res405.headers['cache-control']).toBe('no-store');

    const res415 = createMockRes();
    await routineHandler({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: {} }, res415);
    expect(res415.statusCode).toBe(415);
  });

  it('rejects >128 KB payloads with 413 (header, object, and stream)', async () => {
    const resHeader = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': String(130 * 1024) }, body: VALID_QUESTIONS_REQ },
      resHeader,
    );
    expect(resHeader.statusCode).toBe(413);

    const resObj = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: { ...VALID_QUESTIONS_REQ, notes: 'x'.repeat(132 * 1024) } },
      resObj,
    );
    expect(resObj.statusCode).toBe(413);

    const streamReq = Object.assign(new EventEmitter(), { method: 'POST', headers: { 'content-type': 'application/json' } });
    const resStream = createMockRes();
    const pending = questionsHandler(streamReq, resStream);
    streamReq.emit('data', Buffer.alloc(130 * 1024, 97));
    await pending;
    expect(resStream.statusCode).toBe(413);
  });

  it('rejects invalid JSON or Zod schema violations with 400', async () => {
    const badJsonRes = createMockRes();
    await questionsHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' }, badJsonRes);
    expect(badJsonRes.statusCode).toBe(400);

    const badZodRes = createMockRes();
    await questionsHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { ...VALID_QUESTIONS_REQ, aqi: 999 } }, badZodRes);
    expect(badZodRes.statusCode).toBe(400);
  });

  it('returns 200 with source gemini-2.5-flash across all 5 AI actions', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ airContextNote: 'Delhi AQI 280.', questions: [{ id: 'q1', question: 'Metro?', reason: 'Clean.', quickOptions: ['Yes', 'No', 'WFH'] }] }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ routineHeadline: 'Delhi Routine', blocks: [{ id: 'b1', timeBlock: 'Morning', timeRange: '7–10 AM', title: 'Seal', recommendedAction: 'Close', whyThisMatters: 'Lowers PM2.5', protectionWeight: 100, gearOrPrep: 'N95' }], dailySummaryNote: 'Grounded.' }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ protocolHeadline: 'Indoor Plan', rooms: [{ room: 'Living Room', priorityLevel: 'Critical', hacks: ['Seal door'], costTier: '₹0' }], plantRealityCheck: 'Supplement only.', budgetTip: 'Foam tape.' }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ shockScenario: 'Power Cut', severityAssessment: 'High', strategies: [{ id: 's1', title: 'Seal room', targetTimeBlock: 'Night', immediateAction: 'Consolidate', healthAndEmissionImpact: '-35%', updatedRoutineTitle: 'Clean Room' }] }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ executiveSnapshot: 'Snap', whatsappAdvisory: 'WA', rwaNotice: 'RWA', carpoolPitch: 'Pool' }) });

    const qRes = createMockRes();
    await questionsHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: VALID_QUESTIONS_REQ }, qRes);
    expect(qRes.statusCode).toBe(200);
    expect((qRes.jsonBody as { source: string }).source).toBe('gemini-2.5-flash');

    const rRes = createMockRes();
    await routineHandler({
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: { city: 'Delhi', readingIsoTime: '2026-11-27T08:00', cpcbAqi: 280, cpcbCategory: 'Poor', currentPollutants: { pm2_5: 112, pm10: 210, nitrogen_dioxide: 40, ozone: 30, sulphur_dioxide: 10, us_aqi: 185 }, bestWindow: null, worstWindow: null, hasHouseholdProfile: true, profile: VALID_PROFILE, clarifyingAnswers: {}, additionalContext: null },
    }, rRes);
    expect(rRes.statusCode).toBe(200);

    const iRes = createMockRes();
    await indoorHandler({
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: { city: 'Delhi', cpcbAqi: 280, cpcbCategory: 'Poor', outdoorPm25: 112, hasHouseholdProfile: true, profile: VALID_PROFILE, indoorMeter: { outdoorPm25: 112, beforePm25: 90, afterPm25: 30, reductionPercent: 67, appliedMeasures: ['HEPA'] }, additionalContext: null },
    }, iRes);
    expect(iRes.statusCode).toBe(200);

    const sRes = createMockRes();
    await shockHandler({
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: { shockScenario: 'Power Cut', city: 'Delhi', cpcbAqi: 280, outdoorPm25: 112, hasHouseholdProfile: true, profile: VALID_PROFILE, activeRoutineHeadline: null },
    }, sRes);
    expect(sRes.statusCode).toBe(200);

    const cRes = createMockRes();
    await communityHandler({
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: { city: 'Delhi', readingIsoTime: '2026-11-27T08:00', cpcbAqi: 280, cpcbCategory: 'Poor', dominantPollutant: 'PM2.5', outdoorPm25: 112, bestWindow: null, hasHouseholdProfile: true, profile: VALID_PROFILE, swapTotals: { weeklyCo2KgAvoided: 12, pm25ExposureReductionPct: 30, monthlyRupeesSaved: 2500 }, routineHeadline: null },
    }, cRes);
    expect(cRes.statusCode).toBe(200);
  });

  it('falls back to gemini-2.0-flash on retryable errors and streams SSE cleanly', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
      .mockResolvedValueOnce({ text: JSON.stringify({ airContextNote: 'Delhi AQI 280.', questions: [{ id: 'q1', question: 'Metro?', reason: 'Clean.', quickOptions: ['Yes', 'No', 'WFH'] }] }) });

    const fallbackRes = createMockRes();
    await questionsHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: VALID_QUESTIONS_REQ }, fallbackRes);
    expect(fallbackRes.statusCode).toBe(200);
    expect((fallbackRes.jsonBody as { source: string }).source).toBe('gemini-2.0-flash');

    mockGenerateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: '{"airContextNote":"Delhi 280",' };
        yield { text: '"questions":[{"id":"q1","question":"Q?","reason":"R","quickOptions":["A","B","C"]}]}' };
      })(),
    );
    const sseRes = createMockRes();
    await streamHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: VALID_QUESTIONS_REQ }, sseRes);
    expect(sseRes.chunks.join('')).toContain('event: done');
    expect(sseRes.chunks.join('')).toContain('gemini-2.5-flash');
  });

  it('rejects placeholder keys and returns secret-free 500 errors', async () => {
    process.env.GEMINI_API_KEY = 'your_google_ai_studio_api_key_here';
    const placeholderRes = createMockRes();
    await questionsHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: VALID_QUESTIONS_REQ }, placeholderRes);
    expect(placeholderRes.statusCode).toBe(500);
    expect(JSON.stringify(placeholderRes.jsonBody)).not.toContain('your_google_ai_studio_api_key_here');

    process.env.GEMINI_API_KEY = 'SUPER_SECRET_KEY_XYZ_987';
    mockGenerateContent.mockRejectedValueOnce(new Error('Fatal error using SUPER_SECRET_KEY_XYZ_987 at /secret/stack'));
    const secretRes = createMockRes();
    await questionsHandler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: VALID_QUESTIONS_REQ }, secretRes);
    expect(secretRes.statusCode).toBe(500);
    expect(JSON.stringify(secretRes.jsonBody)).not.toContain('SUPER_SECRET_KEY_XYZ_987');
    expect(JSON.stringify(secretRes.jsonBody)).not.toContain('/secret/stack');
  });
});
