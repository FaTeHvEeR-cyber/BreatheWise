import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  callClarifyingQuestions,
  callCommunityBriefing,
  callDailyRoutine,
  callIndoorProtocol,
  callSmogShock,
  streamClarifyingQuestionsClient,
} from './aiClient';
import {
  buildFallbackCommunityBriefing,
  buildFallbackIndoorProtocol,
  buildFallbackQuestions,
  buildFallbackRoutine,
  buildFallbackShockStrategies,
} from '../utils/fallbackAdvisor';
import { computeCpcbAqi } from '../utils/cpcbAqi';
import { analyzeVentilationWindows } from '../utils/ventilationWindows';
import { EMPTY_HOUSEHOLD_PROFILE, EVALUATOR_SAMPLE_PROFILES, QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';

function makeStreamBody(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

describe('aiClient & deterministic fallback provenance', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls all 5 REST endpoints and preserves Gemini provenance', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        new Response(JSON.stringify({ okUrl: url, source: 'gemini-3.8-flash' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const q = await callClarifyingQuestions({ city: 'Delhi' });
    const r = await callDailyRoutine({ city: 'Delhi' });
    const i = await callIndoorProtocol({ city: 'Delhi' });
    const s = await callSmogShock({ city: 'Delhi' });
    const c = await callCommunityBriefing({ city: 'Delhi' });

    expect(q.source).toBe('gemini-3.8-flash');
    expect(r.source).toBe('gemini-3.8-flash');
    expect(i.source).toBe('gemini-3.8-flash');
    expect(s.source).toBe('gemini-3.8-flash');
    expect(c.source).toBe('gemini-3.8-flash');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('propagates clean API errors on HTTP 400/500 and network/timeout rejections', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid request payload.' }), { status: 400 }),
      ),
    );
    await expect(callDailyRoutine({})).rejects.toThrow('Invalid request payload.');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('not json', { status: 500 })),
    );
    await expect(callIndoorProtocol({})).rejects.toThrow('HTTP 500');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Request timed out')));
    await expect(callSmogShock({})).rejects.toThrow('Request timed out');
  });

  it('streams SSE partial clarifying questions and handles SSE errors', async () => {
    const partials: string[] = [];
    const sseBody = makeStreamBody([
      'event: chunk\ndata: {"delta":"{\\"airContextNote\\":\\"Delhi 310\\","}\n\n',
      'event: chunk\ndata: {"delta":"\\"questions\\":[{\\"id\\":\\"q1\\",\\"question\\":\\"Metro?\\",\\"reason\\":\\"Clean\\",\\"quickOptions\\":[\\"Yes\\",\\"No\\",\\"WFH\\"]}]}"}\n\n',
      'event: done\ndata: {"airContextNote":"Delhi 310","questions":[{"id":"q1","question":"Metro?","reason":"Clean","quickOptions":["Yes","No","WFH"]}],"source":"gemini-3.8-flash"}\n\n',
    ]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(sseBody, { status: 200 })));
    const result = await streamClarifyingQuestionsClient({}, (p) => partials.push(p.airContextNote));
    expect(partials.length).toBeGreaterThan(0);
    expect(result.source).toBe('gemini-3.8-flash');

    const errorBody = makeStreamBody(['event: error\ndata: {"error":"Stream unavailable"}\n\n']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(errorBody, { status: 200 })));
    await expect(streamClarifyingQuestionsClient({}, () => {})).rejects.toThrow('Stream unavailable');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(makeStreamBody([]), { status: 200 })));
    await expect(streamClarifyingQuestionsClient({}, () => {})).rejects.toThrow('Gemini stream ended');

    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, body: null })
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ airContextNote: 'ok', questions: [], source: 'gemini-3.8-flash' }), { status: 200 }),
        ),
    );
    const noBodyRes = await streamClarifyingQuestionsClient({}, () => {});
    expect(noBodyRes.source).toBe('gemini-3.8-flash');
  });

  it('marks all deterministic fallback responses with source: deterministic', () => {
    const current = { pm2_5: 120, pm10: 210, nitrogen_dioxide: 45, ozone: 30, sulphur_dioxide: 12, us_aqi: 185 };
    const cpcb = computeCpcbAqi(current);
    const liveData = {
      location: QUICK_INDIAN_CITIES[0],
      sourceName: 'Open-Meteo Air Quality API' as const,
      sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
      readingIsoTime: '2026-11-27T08:00',
      fetchedAtIso: '2026-11-27T08:05:00.000Z',
      current,
      hourly24h: [
        { isoTime: '2026-11-27T12:00', hourLabel: '12 PM', pm2_5: 30, pm10: 60, us_aqi: 80, cpcbPm25SubIndex: 50 },
        { isoTime: '2026-11-27T13:00', hourLabel: '1 PM', pm2_5: 28, pm10: 55, us_aqi: 75, cpcbPm25SubIndex: 47 },
      ],
    };
    const vent = analyzeVentilationWindows(liveData.hourly24h, 120, 2);
    const swaps = { selectedCount: 1, weeklyCo2KgAvoided: 10, annualCo2KgAvoided: 480, pm25ExposureReductionPct: 22, monthlyRupeesSaved: 1500, rows: [] };
    const hepaProfile = EVALUATOR_SAMPLE_PROFILES[0].profile;

    expect(buildFallbackQuestions(liveData, cpcb, EMPTY_HOUSEHOLD_PROFILE).source).toBe('deterministic');
    expect(buildFallbackQuestions(liveData, cpcb, hepaProfile).source).toBe('deterministic');
    expect(buildFallbackRoutine(liveData, cpcb, EMPTY_HOUSEHOLD_PROFILE, vent).source).toBe('deterministic');
    expect(buildFallbackRoutine(liveData, cpcb, hepaProfile, vent).source).toBe('deterministic');
    expect(buildFallbackIndoorProtocol(liveData, cpcb, EMPTY_HOUSEHOLD_PROFILE).source).toBe('deterministic');
    expect(buildFallbackIndoorProtocol(liveData, cpcb, hepaProfile).source).toBe('deterministic');
    expect(buildFallbackShockStrategies('Power cut', liveData, cpcb).source).toBe('deterministic');
    expect(buildFallbackCommunityBriefing(liveData, cpcb, hepaProfile, vent, swaps).source).toBe('deterministic');
  });
});
