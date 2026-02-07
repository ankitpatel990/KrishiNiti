/**
 * ErrorBoundary - Global error boundary component.
 *
 * Catches uncaught JavaScript errors in the component tree below it
 * and renders a fallback UI instead of crashing the entire application.
 * Provides a "Try again" recovery action that resets the error state.
 *
 * This is a React class component because error boundaries require
 * componentDidCatch / getDerivedStateFromError lifecycle methods.
 */

import { Component } from "react";
import PropTypes from "prop-types";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development; in production this would
    // integrate with an error tracking service (Sentry, etc.).
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          reset: this.handleReset,
        });
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 mb-5">
              <ExclamationTriangleIcon className="h-8 w-8 text-danger-500" />
            </div>

            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
              An unexpected error occurred. This has been noted and we are
              working to fix it. Please try again or reload the page.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <summary className="text-xs font-medium text-neutral-500 cursor-pointer">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-danger-700 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
};

export default ErrorBoundary;
