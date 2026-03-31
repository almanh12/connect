"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional: wrap in a card for section-level boundaries */
  variant?: "page" | "section";
}

interface State {
  hasError: boolean;
  error?: Error;
  retryKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isSection = this.props.variant === "section";
      return (
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 sm:p-8 text-center ${
            isSection ? "min-h-[200px]" : "min-h-[50vh]"
          }`}
          role="alert"
        >
          <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500" aria-hidden />
          <h2 className="mt-4 text-base sm:text-lg font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-600">
            We encountered an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004B87] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0072CE]"
            aria-label="Try again"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
