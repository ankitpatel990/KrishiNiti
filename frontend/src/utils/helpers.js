/**
 * General-purpose utility/helper functions.
 *
 * Pure, side-effect-free functions for common formatting,
 * date operations, and data transformations used across the UI.
 */

// ---------------------------------------------------------------------------
// Date Formatting
// ---------------------------------------------------------------------------

/**
 * Format an ISO date string to a human-readable short date.
 * Example: "2026-02-07T10:30:00Z" -> "07 Feb 2026"
 *
 * @param {string|Date} dateInput - ISO string or Date object.
 * @param {string}      locale   - BCP 47 locale tag.
 * @returns {string} Formatted date string.
 */
export function formatDate(dateInput, locale = "en-IN") {
  if (!dateInput) {
    return "N/A";
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format an ISO date string to a short date + time.
 * Example: "2026-02-07T10:30:00Z" -> "07 Feb 2026, 04:00 PM"
 *
 * @param {string|Date} dateInput - ISO string or Date object.
 * @param {string}      locale   - BCP 47 locale tag.
 * @returns {string} Formatted date-time string.
 */
export function formatDateTime(dateInput, locale = "en-IN") {
  if (!dateInput) {
    return "N/A";
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return a relative time description (e.g. "2 hours ago").
 *
 * @param {string|Date} dateInput - ISO string or Date object.
 * @returns {string} Relative time string.
 */
export function timeAgo(dateInput) {
  if (!dateInput) {
    return "N/A";
  }
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}

// ---------------------------------------------------------------------------
// Price / Currency Formatting
// ---------------------------------------------------------------------------

/**
 * Format a number as Indian Rupee currency.
 * Example: 2250.5 -> "Rs 2,250.50"
 *
 * @param {number} amount          - Numeric value.
 * @param {number} fractionDigits  - Decimal places (default 2).
 * @returns {string} Formatted currency string.
 */
export function formatPrice(amount, fractionDigits = 2) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "N/A";
  }
  return `Rs ${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/**
 * Format a price per quintal with unit label.
 *
 * @param {number} price - Price per quintal.
 * @returns {string} Formatted string e.g. "Rs 2,250/qtl"
 */
export function formatPricePerQuintal(price) {
  if (price === null || price === undefined) {
    return "N/A";
  }
  return `${formatPrice(price, 0)}/qtl`;
}

// ---------------------------------------------------------------------------
// Temperature Formatting
// ---------------------------------------------------------------------------

/**
 * Format a temperature value with the degree symbol.
 *
 * @param {number} temp - Temperature in Celsius.
 * @param {number} decimals - Decimal places.
 * @returns {string} e.g. "28.5 C"
 */
export function formatTemperature(temp, decimals = 1) {
  if (temp === null || temp === undefined) {
    return "N/A";
  }
  return `${Number(temp).toFixed(decimals)} C`;
}

// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------

/**
 * Format a percentage value.
 *
 * @param {number} value    - Decimal (0-1) or percentage (0-100).
 * @param {boolean} isDecimal - If true, multiply by 100 first.
 * @returns {string} e.g. "85.2%"
 */
export function formatPercentage(value, isDecimal = false) {
  if (value === null || value === undefined) {
    return "N/A";
  }
  const pct = isDecimal ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// String Utilities
// ---------------------------------------------------------------------------

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} str - Input string.
 * @returns {string} Capitalized string.
 */
export function capitalize(str) {
  if (!str) {
    return "";
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a string to title case.
 *
 * @param {string} str - Input string.
 * @returns {string} Title-cased string.
 */
export function titleCase(str) {
  if (!str) {
    return "";
  }
  return str
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Truncate a string to a maximum length with an ellipsis.
 *
 * @param {string} str       - Input string.
 * @param {number} maxLength - Maximum character count.
 * @returns {string} Truncated string.
 */
export function truncate(str, maxLength = 100) {
  if (!str) {
    return "";
  }
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength).trimEnd()}...`;
}

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------

/**
 * Generate a simple unique ID (for UI keys, not cryptographic).
 *
 * @param {string} prefix - Optional prefix.
 * @returns {string} Unique identifier.
 */
export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce a function call.
 *
 * @param {Function} fn    - Function to debounce.
 * @param {number}   delay - Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(fn, delay = 300) {
  let timerId;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Clamp a number within min and max bounds.
 *
 * @param {number} value - Input value.
 * @param {number} min   - Lower bound.
 * @param {number} max   - Upper bound.
 * @returns {number} Clamped value.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Deep-clone a plain object or array via structured cloning.
 *
 * @param {*} obj - Object to clone.
 * @returns {*} Deep copy.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  return structuredClone(obj);
}
