/**
 * Input - Reusable text input with label, validation, and error display.
 *
 * Supports all standard HTML input types, optional leading/trailing
 * icons, helper text, and inline error messages.
 */

import { forwardRef } from "react";
import PropTypes from "prop-types";

const Input = forwardRef(function Input(
  {
    id,
    name,
    type = "text",
    label,
    placeholder,
    value,
    defaultValue,
    onChange,
    onBlur,
    disabled = false,
    readOnly = false,
    required = false,
    error,
    helperText,
    leadingIcon,
    trailingIcon,
    className = "",
    inputClassName = "",
    ...rest
  },
  ref,
) {
  const inputId = id || name;
  const hasError = Boolean(error);
  const describedBy = [];
  if (hasError) {
    describedBy.push(`${inputId}-error`);
  }
  if (helperText && !hasError) {
    describedBy.push(`${inputId}-helper`);
  }

  const ringColor = hasError
    ? "border-danger-500 focus:ring-danger-500 focus:border-danger-500"
    : "border-neutral-300 focus:ring-primary-500 focus:border-primary-500";

  const inputClasses = [
    "block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900",
    "placeholder:text-neutral-400",
    "transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-offset-0",
    "disabled:bg-neutral-100 disabled:cursor-not-allowed",
    "read-only:bg-neutral-50",
    ringColor,
    leadingIcon ? "pl-10" : "",
    trailingIcon ? "pr-10" : "",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
          {required && (
            <span className="text-danger-500 ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            {leadingIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            describedBy.length > 0 ? describedBy.join(" ") : undefined
          }
          className={inputClasses}
          {...rest}
        />

        {trailingIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
            {trailingIcon}
          </div>
        )}
      </div>

      {hasError && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-danger-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {helperText && !hasError && (
        <p
          id={`${inputId}-helper`}
          className="mt-1 text-sm text-neutral-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  leadingIcon: PropTypes.node,
  trailingIcon: PropTypes.node,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
};

export default Input;
