/**
 * Select - Dropdown select component with optional search/filter.
 *
 * Renders a native <select> by default. When `searchable` is true,
 * renders a custom filterable dropdown using a text input and a
 * list of matching options.
 */

import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import PropTypes from "prop-types";

// ---------------------------------------------------------------------------
// Native Select (default)
// ---------------------------------------------------------------------------

const NativeSelect = forwardRef(function NativeSelect(
  {
    id,
    name,
    label,
    options,
    value,
    onChange,
    placeholder,
    disabled,
    required,
    error,
    helperText,
    className,
  },
  ref,
) {
  const selectId = id || name;
  const hasError = Boolean(error);

  const ringColor = hasError
    ? "border-danger-500 focus:ring-danger-500"
    : "border-neutral-300 focus:ring-primary-500";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
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

      <select
        ref={ref}
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${selectId}-error` : undefined}
        className={[
          "block w-full rounded-lg border px-3 py-2 text-sm text-neutral-900",
          "bg-white transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-offset-0",
          "disabled:bg-neutral-100 disabled:cursor-not-allowed",
          ringColor,
        ].join(" ")}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasError && (
        <p
          id={`${selectId}-error`}
          className="mt-1 text-sm text-danger-600"
          role="alert"
        >
          {error}
        </p>
      )}
      {helperText && !hasError && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Searchable Select
// ---------------------------------------------------------------------------

function SearchableSelect({
  id,
  name,
  label,
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled,
  required,
  error,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectId = id || name;
  const hasError = Boolean(error);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = useCallback(
    (optionValue) => {
      if (onChange) {
        onChange({ target: { name, value: optionValue } });
      }
      setIsOpen(false);
      setQuery("");
    },
    [onChange, name],
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    },
    [],
  );

  const ringColor = hasError
    ? "border-danger-500 focus-within:ring-danger-500"
    : "border-neutral-300 focus-within:ring-primary-500";

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
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
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => {
            setIsOpen((prev) => !prev);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={hasError}
          className={[
            "flex w-full items-center justify-between rounded-lg border px-3 py-2",
            "text-sm text-left bg-white",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            "disabled:bg-neutral-100 disabled:cursor-not-allowed",
            ringColor,
          ].join(" ")}
        >
          <span className={selectedOption ? "text-neutral-900" : "text-neutral-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`h-4 w-4 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg"
            role="listbox"
            onKeyDown={handleKeyDown}
          >
            <div className="p-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full rounded border border-neutral-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                aria-label="Filter options"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-500">
                  No results found
                </li>
              )}
              {filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  className={[
                    "cursor-pointer px-3 py-2 text-sm",
                    "hover:bg-primary-50",
                    opt.value === value
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-neutral-700",
                    opt.disabled ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (!opt.disabled) {
                      handleSelect(opt.value);
                    }
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {hasError && (
        <p className="mt-1 text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composite Select
// ---------------------------------------------------------------------------

const OPTION_SHAPE = PropTypes.shape({
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
});

const Select = forwardRef(function Select(props, ref) {
  if (props.searchable) {
    return <SearchableSelect {...props} />;
  }
  return <NativeSelect ref={ref} {...props} />;
});

Select.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  options: PropTypes.arrayOf(OPTION_SHAPE).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  searchable: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  className: PropTypes.string,
};

Select.defaultProps = {
  searchable: false,
  className: "",
};

export default Select;
