/**
 * EmptyState - Reusable placeholder for empty data views.
 *
 * Displays an illustration (SVG or icon), title, description,
 * and an optional call-to-action button. Used when a list, table,
 * or content area has no data to show.
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Built-in Illustrations
// ---------------------------------------------------------------------------

function NoDataIllustration({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="56" fill="currentColor" opacity="0.06" />
      <circle cx="60" cy="60" r="40" fill="currentColor" opacity="0.08" />
      <rect x="40" y="35" width="40" height="50" rx="4" fill="currentColor" opacity="0.15" />
      <rect x="47" y="45" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
      <rect x="47" y="52" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
      <rect x="47" y="59" width="23" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
      <rect x="47" y="66" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
      <circle cx="60" cy="80" r="6" fill="currentColor" opacity="0.12" />
      <line x1="57" y1="77" x2="63" y2="83" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
      <line x1="63" y1="77" x2="57" y2="83" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

NoDataIllustration.propTypes = {
  className: PropTypes.string,
};

function SearchIllustration({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="56" fill="currentColor" opacity="0.06" />
      <circle cx="52" cy="52" r="20" stroke="currentColor" strokeWidth="3" opacity="0.2" fill="none" />
      <line x1="66" y1="66" x2="82" y2="82" stroke="currentColor" strokeWidth="3" opacity="0.25" strokeLinecap="round" />
      <circle cx="52" cy="52" r="10" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

SearchIllustration.propTypes = {
  className: PropTypes.string,
};

const ILLUSTRATIONS = {
  noData: NoDataIllustration,
  search: SearchIllustration,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EmptyState({
  illustration = "noData",
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = "",
}) {
  const IllustrationComponent = ILLUSTRATIONS[illustration];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {/* Illustration or custom icon */}
      {icon ? (
        <div className="h-20 w-20 rounded-2xl bg-neutral-100 flex items-center justify-center mb-5 text-neutral-400">
          {icon}
        </div>
      ) : IllustrationComponent ? (
        <IllustrationComponent className="h-28 w-28 text-neutral-400 mb-5" />
      ) : null}

      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-neutral-700 mb-2">{title}</h3>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Actions */}
      {(actionLabel || secondaryLabel) && (
        <div className="flex items-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

EmptyState.propTypes = {
  illustration: PropTypes.oneOf(["noData", "search"]),
  icon: PropTypes.node,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  secondaryLabel: PropTypes.string,
  onSecondaryAction: PropTypes.func,
  className: PropTypes.string,
};

export default EmptyState;
