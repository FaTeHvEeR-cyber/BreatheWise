import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLiveCityAirQuality, searchIndianAndGlobalCities } from './aqiService';
import { QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';

describe('aqiService Open-Meteo integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prioritizes Indian cities in geocoding search and handles short queries', async () => {
    expect(await searchIndianAndGlobalCities('a')).toEqual([]);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                id: 1,
                name: 'Delhi',
                country: 'Canada',
                country_code: 'CA',
                latitude: 42.85,
                longitude: -80.5,
              },
              {
                id: 2,
                name: 'Delhi',
                admin1: 'Delhi',
                country: 'India',
                country_code: 'IN',
                latitude: 28.6139,
                longitude: 77.209,
                timezone: 'Asia/Kolkata',
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const matches = await searchIndianAndGlobalCities('Delhi');
    expect(matches[0].country).toBe('India');
    expect(matches[0].id).toBe('geo-2');
  });

  it('fetches live air quality readings and throws cleanly on non-OK HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: {
              time: '2026-11-27T08:00',
              pm2_5: 112.4,
              pm10: 210,
              nitrogen_dioxide: 42,
              ozone: 30,
              sulphur_dioxide: 12,
              us_aqi: 185,
            },
            hourly: {
              time: ['2026-11-27T08:00', '2026-11-27T09:00'],
              pm2_5: [112.4, null],
              pm10: [210, 190],
              us_aqi: [185, 175],
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const data = await fetchLiveCityAirQuality(QUICK_INDIAN_CITIES[0]);
    expect(data.current.pm2_5).toBe(112.4);
    expect(data.hourly24h).toHaveLength(1);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('fail', { status: 503 })));
    await expect(fetchLiveCityAirQuality(QUICK_INDIAN_CITIES[0])).rejects.toThrow('HTTP 503');
  });

  it('handles geocoding HTTP errors, empty results, and missing AQI payload fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('bad', { status: 502 })));
    await expect(searchIndianAndGlobalCities('Jaipur')).rejects.toThrow('HTTP 502');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ id: 99, name: 'Testville', latitude: 25.12345, longitude: 75.98765 }],
          }),
          { status: 200 },
        ),
      ),
    );
    const fallbackMeta = await searchIndianAndGlobalCities('Testville');
    expect(fallbackMeta[0].country).toBe('Unknown');
    expect(fallbackMeta[0].timezone).toBe('Asia/Kolkata');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 })),
    );
    expect(await searchIndianAndGlobalCities('NowhereCity')).toEqual([]);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 })),
    );
    const minimal = await fetchLiveCityAirQuality({
      ...QUICK_INDIAN_CITIES[0],
      timezone: '',
    });
    expect(minimal.current.pm2_5).toBeNull();
    expect(minimal.hourly24h).toEqual([]);
    expect(minimal.readingIsoTime).toBe(minimal.fetchedAtIso);
  });
});
