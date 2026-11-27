import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimiter } from '../src/services/rateLimiter';
import {
  createMockRes,
  MOCK_GEMINI_RESPONSES,
  VALID_PROFILE,
  VALID_QUESTIONS_REQ,
} from './apiTestUtils';

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/genai', async () => {
  const actual = await vi.importActual<typeof import('@google/genai')>('@google/genai');
  return {
    ...actual,
    GoogleGenAI: vi.fn(() => ({
      models: {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
      },
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

const jsonHeaders = { 'content-type': 'application/json' };

describe('Vercel API functional endpoints & Gemini responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiter();
    process.env.GEMINI_API_KEY = 'test-secret-api-key-12345';
    delete process.env.GEMINI_MODEL;
  });

  it('handles /api/health GET with geminiConfigured/model and rejects POST with 405', () => {
    const res = createMockRes();
    healthHandler({ method: 'GET', headers: {} }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.jsonBody).toMatchObject({
      status: 'ok',
      geminiConfigured: true,
      model: 'gemini-3.8-flash',
    });
    expect(JSON.stringify(res.jsonBody)).not.toContain('test-secret-api-key-12345');

    delete process.env.GEMINI_API_KEY;
    const unconfiguredRes = createMockRes();
    healthHandler({ method: 'GET', headers: {} }, unconfiguredRes);
    expect((unconfiguredRes.jsonBody as { geminiConfigured: boolean }).geminiConfigured).toBe(
      false,
    );

    const badRes = createMockRes();
    healthHandler({ method: 'POST', headers: {} }, badRes);
    expect(badRes.statusCode).toBe(405);
    expect(badRes.headers.allow).toBe('GET');
  });

  it('returns 200 with source gemini-3.8-flash across all 5 AI actions', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify(MOCK_GEMINI_RESPONSES.questions) })
      .mockResolvedValueOnce({ text: JSON.stringify(MOCK_GEMINI_RESPONSES.routine) })
      .mockResolvedValueOnce({ text: JSON.stringify(MOCK_GEMINI_RESPONSES.indoor) })
      .mockResolvedValueOnce({ text: JSON.stringify(MOCK_GEMINI_RESPONSES.shock) })
      .mockResolvedValueOnce({ text: JSON.stringify(MOCK_GEMINI_RESPONSES.community) });

    const qRes = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      qRes,
    );
    expect(qRes.statusCode).toBe(200);
    expect((qRes.jsonBody as { source: string }).source).toBe('gemini-3.8-flash');

    const rRes = createMockRes();
    await routineHandler(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: {
          city: 'Delhi',
          readingIsoTime: '2026-11-27T08:00',
          cpcbAqi: 280,
          cpcbCategory: 'Poor',
          currentPollutants: {
            pm2_5: 112,
            pm10: 210,
            nitrogen_dioxide: 40,
            ozone: 30,
            sulphur_dioxide: 10,
            us_aqi: 185,
          },
          bestWindow: null,
          worstWindow: null,
          hasHouseholdProfile: true,
          profile: VALID_PROFILE,
          clarifyingAnswers: {},
          additionalContext: null,
        },
      },
      rRes,
    );
    expect(rRes.statusCode).toBe(200);

    const iRes = createMockRes();
    await indoorHandler(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: {
          city: 'Delhi',
          cpcbAqi: 280,
          cpcbCategory: 'Poor',
          outdoorPm25: 112,
          hasHouseholdProfile: true,
          profile: VALID_PROFILE,
          indoorMeter: {
            outdoorPm25: 112,
            beforePm25: 90,
            afterPm25: 30,
            reductionPercent: 67,
            appliedMeasures: ['HEPA'],
          },
          additionalContext: null,
        },
      },
      iRes,
    );
    expect(iRes.statusCode).toBe(200);

    const sRes = createMockRes();
    await shockHandler(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: {
          shockScenario: 'Power Cut',
          city: 'Delhi',
          cpcbAqi: 280,
          outdoorPm25: 112,
          hasHouseholdProfile: true,
          profile: VALID_PROFILE,
          activeRoutineHeadline: null,
        },
      },
      sRes,
    );
    expect(sRes.statusCode).toBe(200);

    const cRes = createMockRes();
    await communityHandler(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: {
          city: 'Delhi',
          readingIsoTime: '2026-11-27T08:00',
          cpcbAqi: 280,
          cpcbCategory: 'Poor',
          dominantPollutant: 'PM2.5',
          outdoorPm25: 112,
          bestWindow: null,
          hasHouseholdProfile: true,
          profile: VALID_PROFILE,
          swapTotals: {
            weeklyCo2KgAvoided: 12,
            pm25ExposureReductionPct: 30,
            monthlyRupeesSaved: 2500,
          },
          routineHeadline: null,
        },
      },
      cRes,
    );
    expect(cRes.statusCode).toBe(200);
  });

  it('falls back to gemini-3.1-flash-lite on retryable errors and streams SSE cleanly', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
      .mockResolvedValueOnce({ text: JSON.stringify(MOCK_GEMINI_RESPONSES.questions) });

    const fallbackRes = createMockRes();
    await questionsHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      fallbackRes,
    );
    expect(fallbackRes.statusCode).toBe(200);
    expect((fallbackRes.jsonBody as { source: string }).source).toBe('gemini-3.1-flash-lite');

    mockGenerateContentStream.mockResolvedValueOnce(
      (async function* () {
        yield { text: '```json\n{"airContextNote":"Delhi 280",' };
        yield {
          text: '"questions":[{"id":"q1","question":"Q?","reason":"","quickOptions":["A","B","C"]}]}\n```',
        };
      })(),
    );
    const sseRes = createMockRes();
    await streamHandler(
      { method: 'POST', headers: jsonHeaders, body: VALID_QUESTIONS_REQ },
      sseRes,
    );
    expect(sseRes.chunks.join('')).toContain('event: done');
    expect(sseRes.chunks.join('')).toContain('gemini-3.8-flash');
  });
});
