/**
 * Button - Reusable button component with variant, size, and state support.
 *
 * Variants: primary | secondary | danger | ghost | outline
 * Sizes:    sm | md | lg
 *
 * Supports loading state with spinner, disabled state,
 * full-width mode, and icon placement (left or right).
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";

const VARIANT_CLASSES = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800",
  secondary:
    "bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-400 active:bg-secondary-700",
  danger:
    "bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 active:bg-danger-800",
  ghost:
    "bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-400 active:bg-neutral-200",
  outline:
    "bg-transparent border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 active:bg-primary-100",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    type = "button",
    disabled = false,
    loading = false,
    fullWidth = false,
    icon = null,
    iconPosition = "left",
    className = "",
    onClick,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
    "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const classes = [
    baseClasses,
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
    SIZE_CLASSES[size] || SIZE_CLASSES.md,
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={classes}
      onClick={onClick}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {!loading && icon && iconPosition === "left" && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {!loading && icon && iconPosition === "right" && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
});

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "ghost", "outline"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(["left", "right"]),
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Button;
