/**
 * ErrorMessage - Inline error/alert display.
 *
 * Renders a styled error box with an optional retry action.
 * Supports dismissible mode via an onDismiss callback.
 */

import PropTypes from "prop-types";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

function ErrorMessage({
  message,
  title,
  onRetry,
  onDismiss,
  className = "",
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-danger-200 bg-danger-50 p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon
          className="h-5 w-5 shrink-0 text-danger-500 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-semibold text-danger-800 mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm text-danger-700">{message}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-danger-700 underline hover:text-danger-900 focus:outline-none focus:ring-2 focus:ring-danger-500 rounded"
            >
              Try again
            </button>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-1 text-danger-400 hover:text-danger-600 hover:bg-danger-100 transition-colors focus:outline-none focus:ring-2 focus:ring-danger-500"
            aria-label="Dismiss error"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

ErrorMessage.propTypes = {
  message: PropTypes.string,
  title: PropTypes.string,
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorMessage;
