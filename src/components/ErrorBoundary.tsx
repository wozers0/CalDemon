import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** compact fallback for a single screen */
  inline?: boolean;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CalDemon error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={`flex flex-col items-center justify-center px-8 text-center ${this.props.inline ? 'h-full py-16' : 'h-full min-h-dvh'}`}>
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <p className="text-[19px] font-bold">Something went wrong</p>
        <p className="mt-1.5 max-w-[280px] text-[14px] leading-snug text-white/55">
          Your data is safe on this device. Try again, or reload the app.
        </p>
        <p className="mt-3 max-w-[300px] truncate text-[12px] text-white/30">{this.state.error.message}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="h-11 rounded-2xl bg-white/[0.08] px-5 font-semibold" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button type="button" className="flex h-11 items-center gap-2 rounded-2xl bg-violet-500 px-5 font-semibold" onClick={() => location.reload()}>
            <RefreshCw className="h-4 w-4" /> Reload
          </button>
        </div>
      </div>
    );
  }
}
