// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { computeCpcbAqi } from '../utils/cpcbAqi';
import { CpcbAqiMeter } from './CpcbAqiMeter';

describe('CpcbAqiMeter accessibility and ARIA semantics', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes WCAG meter role, bounds, and valuetext for live CPCB AQI', () => {
    const cpcb = computeCpcbAqi({
      pm2_5: 173,
      pm10: 220,
      nitrogen_dioxide: 48,
      ozone: 22,
      sulphur_dioxide: 14,
      us_aqi: 210,
    });

    render(<CpcbAqiMeter cpcb={cpcb} />);

    const meter = screen.getByRole('meter', {
      name: 'Indian CPCB National AQI Linear Scale',
    });
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('500');
    expect(meter.getAttribute('aria-valuenow')).toBe(String(cpcb.aqi));
    expect(meter.getAttribute('aria-valuetext')).toContain(cpcb.category.name);
    expect(meter.getAttribute('aria-valuetext')).toContain(cpcb.category.rangeLabel);
  });
});
