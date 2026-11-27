// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { WORKSPACE_TABS } from '../config/constants';
import { Header } from './Header';

describe('Header W3C roving tabs, landmarks, and App skip-link', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('exposes accessible landmarks and valid aria-selected/aria-controls tab bindings', () => {
    render(<Header activeTab="routine" onTabChange={vi.fn()} onOpenAudit={vi.fn()} />);

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'BreatheWise workspaces' })).toBeTruthy();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(WORKSPACE_TABS.length);

    for (const tabMeta of WORKSPACE_TABS) {
      const tab = screen.getByRole('tab', { name: tabMeta.label });
      const selected = tabMeta.id === 'routine';
      expect(tab.id).toBe(`tab-${tabMeta.id}`);
      expect(tab.getAttribute('aria-controls')).toBe(`panel-${tabMeta.id}`);
      expect(tab.getAttribute('aria-selected')).toBe(selected ? 'true' : 'false');
      expect(tab.tabIndex).toBe(selected ? 0 : -1);
    }
  });

  it('supports W3C roving ArrowRight, ArrowLeft, Home, and End keyboard navigation', () => {
    const onTabChange = vi.fn();
    render(<Header activeTab="intake" onTabChange={onTabChange} onOpenAudit={vi.fn()} />);

    const intakeTab = screen.getByRole('tab', { name: 'Intake' });
    const routineTab = screen.getByRole('tab', { name: 'Routine' });
    const communityTab = screen.getByRole('tab', { name: 'Community' });

    intakeTab.focus();
    fireEvent.keyDown(intakeTab, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenLastCalledWith('routine');
    expect(document.activeElement).toBe(routineTab);

    fireEvent.keyDown(intakeTab, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenLastCalledWith('community');
    expect(document.activeElement).toBe(communityTab);

    fireEvent.keyDown(routineTab, { key: 'Home' });
    expect(onTabChange).toHaveBeenLastCalledWith('intake');
    expect(document.activeElement).toBe(intakeTab);

    fireEvent.keyDown(intakeTab, { key: 'End' });
    expect(onTabChange).toHaveBeenLastCalledWith('community');
    expect(document.activeElement).toBe(communityTab);

    const callsBeforeIgnored = onTabChange.mock.calls.length;
    fireEvent.keyDown(intakeTab, { key: 'a' });
    expect(onTabChange).toHaveBeenCalledTimes(callsBeforeIgnored);
  });

  it('handles brand click and CPCB Audit button plus App #main-content skip-link', () => {
    const onTabChange = vi.fn();
    const onOpenAudit = vi.fn();
    render(<Header activeTab="indoor" onTabChange={onTabChange} onOpenAudit={onOpenAudit} />);

    fireEvent.click(screen.getByRole('link', { name: 'BreatheWise' }));
    expect(onTabChange).toHaveBeenCalledWith('intake');

    fireEvent.click(screen.getByRole('button', { name: 'CPCB Audit' }));
    expect(onOpenAudit).toHaveBeenCalledTimes(1);
    cleanup();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => {})),
    );
    render(<App />);
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    const main = screen.getByRole('main');
    expect(main.id).toBe('main-content');
    expect(main.tabIndex).toBe(-1);
  });
});
