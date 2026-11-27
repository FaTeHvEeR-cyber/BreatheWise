// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiveAirQualityData } from '../types';
import { QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';
import { computeCpcbAqi } from '../utils/cpcbAqi';
import { MethodologyDialog } from './MethodologyDialog';

const SAMPLE_LIVE_DATA: LiveAirQualityData = {
  location: QUICK_INDIAN_CITIES[0],
  sourceName: 'Open-Meteo Air Quality API',
  sourceUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  readingIsoTime: '2026-11-27T08:00',
  fetchedAtIso: '2026-11-27T08:05:00.000Z',
  current: {
    pm2_5: 145,
    pm10: 210,
    nitrogen_dioxide: 48,
    ozone: 28,
    sulphur_dioxide: 14,
    us_aqi: 198,
  },
  hourly24h: [],
};

describe('MethodologyDialog native <dialog> focus restoration and Escape handling', () => {
  let showModalSpy: ReturnType<typeof vi.fn>;
  let closeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showModalSpy = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      Object.defineProperty(this, 'open', { configurable: true, value: true });
    });
    closeSpy = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      Object.defineProperty(this, 'open', { configurable: true, value: false });
    });
    HTMLDialogElement.prototype.showModal = showModalSpy as unknown as () => void;
    HTMLDialogElement.prototype.close = closeSpy as unknown as () => void;
  });

  afterEach(() => {
    cleanup();
  });

  it('opens with showModal, handles Escape cancel, and restores focus to trigger on close', () => {
    const cpcb = computeCpcbAqi(SAMPLE_LIVE_DATA.current);
    const onClose = vi.fn();

    const { rerender } = render(
      <>
        <button type="button">Trigger Audit</button>
        <MethodologyDialog open={false} liveData={SAMPLE_LIVE_DATA} cpcb={cpcb} onClose={onClose} />
      </>,
    );

    const trigger = screen.getByRole('button', { name: 'Trigger Audit' });
    trigger.focus();
    expect(showModalSpy).not.toHaveBeenCalled();

    rerender(
      <>
        <button type="button">Trigger Audit</button>
        <MethodologyDialog open={true} liveData={SAMPLE_LIVE_DATA} cpcb={cpcb} onClose={onClose} />
      </>,
    );
    expect(showModalSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Indian CPCB National AQI Formula & Live Data Audit')).toBeTruthy();
    expect(screen.getByText('Live Payload Audit (Auto-Refreshes Every 5 Min)')).toBeTruthy();

    const dialog = document.querySelector('dialog');
    expect(dialog).toBeTruthy();
    const cancelEvent = new Event('cancel', { cancelable: true });
    dialog?.dispatchEvent(cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <button type="button">Trigger Audit</button>
        <MethodologyDialog open={false} liveData={SAMPLE_LIVE_DATA} cpcb={cpcb} onClose={onClose} />
      </>,
    );
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });

  it('supports close button, backdrop click, and null telemetry state', () => {
    const onClose = vi.fn();
    render(<MethodologyDialog open={true} liveData={null} cpcb={null} onClose={onClose} />);

    expect(screen.queryByText('Live Payload Audit (Auto-Refreshes Every 5 Min)')).toBeNull();
    expect(screen.getByText('Official CPCB Breakpoint Table (µg/m³)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close CPCB methodology dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Indian CPCB National AQI Formula & Live Data Audit'));
    expect(onClose).toHaveBeenCalledTimes(1);

    const dialog = document.querySelector('dialog');
    expect(dialog).toBeTruthy();
    if (dialog) {
      fireEvent.click(dialog);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
