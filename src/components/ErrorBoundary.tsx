import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any) {
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = (this as any).state || {};
    const props = (this as any).props || {};

    if (hasError) {
      return (
        <div className="p-6 bg-[#16161c] border border-amber-500/30 rounded-2xl text-white space-y-4 max-w-lg mx-auto my-8 shadow-2xl">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {props.fallbackTitle || 'Component Recovered'}
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                An isolated interface rendering error occurred. The main app remains active.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#0d0d12] border border-[#2a2a38] rounded-xl text-[11px] font-mono text-amber-300/90 overflow-x-auto max-h-32">
              {error.message || String(error)}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-black text-xs rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
