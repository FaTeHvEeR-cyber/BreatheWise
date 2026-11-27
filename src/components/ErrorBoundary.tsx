import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallbackTitle?: string;
  readonly onReset?: () => void;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

/**
 * Accessible React Error Boundary that isolates rendering failures and offers workspace recovery.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[BreatheWise ErrorBoundary]', error.name, info.componentStack?.slice(0, 200));
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-6 max-w-xl border border-red-200 bg-red-50 p-6 text-slate-900"
        >
          <h2 className="text-base font-semibold text-red-900">
            {this.props.fallbackTitle ?? 'Something went wrong in this BreatheWise workspace'}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-red-800">
            Live telemetry and household settings remain safe. Reload the workspace to recover
            cleanly.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 rounded-md bg-teal-800 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
