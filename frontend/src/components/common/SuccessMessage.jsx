/**
 * SuccessMessage - Inline success notification display.
 *
 * Renders a styled success box. Supports dismissible mode
 * via an onDismiss callback.
 */

import PropTypes from "prop-types";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

function SuccessMessage({
  message,
  title,
  onDismiss,
  className = "",
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-primary-200 bg-primary-50 p-4 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <CheckCircleIcon
          className="h-5 w-5 shrink-0 text-primary-500 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-semibold text-primary-800 mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm text-primary-700">{message}</p>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Dismiss message"
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

SuccessMessage.propTypes = {
  message: PropTypes.string,
  title: PropTypes.string,
  onDismiss: PropTypes.func,
  className: PropTypes.string,
};

export default SuccessMessage;
