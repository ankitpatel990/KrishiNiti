/**
 * Badge - Status badge / tag component.
 *
 * Variants: default | primary | secondary | danger | warning | info | success
 * Sizes: sm | md | lg
 * Supports dot indicator and removable mode.
 */

import PropTypes from "prop-types";

const VARIANT_CLASSES = {
  default: "bg-neutral-100 text-neutral-700",
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  danger: "bg-danger-100 text-danger-700",
  warning: "bg-secondary-100 text-secondary-800",
  info: "bg-accent-100 text-accent-700",
  success: "bg-primary-100 text-primary-700",
};

const DOT_COLORS = {
  default: "bg-neutral-500",
  primary: "bg-primary-500",
  secondary: "bg-secondary-500",
  danger: "bg-danger-500",
  warning: "bg-secondary-500",
  info: "bg-accent-500",
  success: "bg-primary-500",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1 text-sm",
};

function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  onRemove,
  className = "",
}) {
  const classes = [
    "inline-flex items-center gap-1.5 rounded-full font-medium",
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
    SIZE_CLASSES[size] || SIZE_CLASSES.md,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {dot && (
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_COLORS[variant] || DOT_COLORS.default}`}
          aria-hidden="true"
        />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 transition-colors focus:outline-none"
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
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
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "danger",
    "warning",
    "info",
    "success",
  ]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  dot: PropTypes.bool,
  onRemove: PropTypes.func,
  className: PropTypes.string,
};

export default Badge;
