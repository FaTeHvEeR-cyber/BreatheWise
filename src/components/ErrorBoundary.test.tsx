// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children when healthy and recovers via Reload Workspace button on error', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) {
        throw new Error('Simulated workspace crash');
      }
      return <p>Healthy workspace content</p>;
    }

    render(
      <ErrorBoundary fallbackTitle="Workspace Failed" onReset={onReset}>
        <MaybeThrow />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Workspace Failed');

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reload Workspace' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Healthy workspace content')).toBeTruthy();
    errSpy.mockRestore();
  });
});
