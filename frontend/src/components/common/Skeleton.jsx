/**
 * Skeleton - Configurable placeholder loader with shimmer animation.
 *
 * Variants:
 *   text   - Horizontal line (for text placeholders)
 *   circle - Circle (for avatars)
 *   card   - Full card placeholder with header, body lines, footer
 *   rect   - Custom rectangle
 *
 * Supports repeating via the `count` prop and custom dimensions.
 */

import PropTypes from "prop-types";

// ---------------------------------------------------------------------------
// Base Skeleton Block
// ---------------------------------------------------------------------------

function SkeletonBlock({ width, height, rounded = "rounded", className = "" }) {
  return (
    <div
      className={`bg-neutral-200 ${rounded} relative overflow-hidden ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

SkeletonBlock.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  rounded: PropTypes.string,
  className: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Preset: Text Lines
// ---------------------------------------------------------------------------

function SkeletonText({ lines = 3, className = "" }) {
  const widths = ["100%", "90%", "75%", "85%", "60%"];

  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={widths[i % widths.length]}
          height={12}
          rounded="rounded-md"
        />
      ))}
    </div>
  );
}

SkeletonText.propTypes = {
  lines: PropTypes.number,
  className: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Preset: Card
// ---------------------------------------------------------------------------

function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Header area */}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <SkeletonBlock width={40} height={40} rounded="rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock width="60%" height={14} rounded="rounded-md" />
            <SkeletonBlock width="40%" height={10} rounded="rounded-md" />
          </div>
        </div>
      </div>

      {/* Body lines */}
      <div className="px-5 pb-5">
        <SkeletonText lines={3} />
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-100 px-5 py-3 bg-neutral-50 flex justify-between">
        <SkeletonBlock width={80} height={28} rounded="rounded-md" />
        <SkeletonBlock width={60} height={28} rounded="rounded-md" />
      </div>
    </div>
  );
}

SkeletonCard.propTypes = {
  className: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Main Skeleton Component
// ---------------------------------------------------------------------------

function Skeleton({
  variant = "text",
  width,
  height,
  count = 1,
  className = "",
}) {
  if (variant === "circle") {
    const size = width || height || 48;
    return (
      <div
        className={`flex flex-wrap gap-3 ${className}`}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBlock
            key={i}
            width={size}
            height={size}
            rounded="rounded-full"
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`grid gap-4 ${count > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""} ${className}`}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (variant === "rect") {
    return (
      <div
        className={className}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBlock
            key={i}
            width={width || "100%"}
            height={height || 100}
            rounded="rounded-lg"
            className={i < count - 1 ? "mb-3" : ""}
          />
        ))}
      </div>
    );
  }

  // Default: text
  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonText key={i} className={i < count - 1 ? "mb-6" : ""} />
      ))}
    </div>
  );
}

Skeleton.propTypes = {
  variant: PropTypes.oneOf(["text", "circle", "card", "rect"]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  count: PropTypes.number,
  className: PropTypes.string,
};

export default Skeleton;
