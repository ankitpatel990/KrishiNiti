/**
 * Unit tests for src/utils/helpers.js
 */

import { describe, it, expect, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  timeAgo,
  formatPrice,
  formatPricePerQuintal,
  formatTemperature,
  formatPercentage,
  capitalize,
  titleCase,
  truncate,
  generateId,
  debounce,
  clamp,
  deepClone,
} from "../../src/utils/helpers";

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("returns 'N/A' for falsy input", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate("")).toBe("N/A");
    expect(formatDate(undefined)).toBe("N/A");
  });

  it("returns 'Invalid date' for bad input", () => {
    expect(formatDate("not-a-date")).toBe("Invalid date");
  });

  it("formats a valid ISO string", () => {
    const result = formatDate("2026-02-07T10:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("N/A");
    expect(result).not.toBe("Invalid date");
  });

  it("accepts a Date object", () => {
    const d = new Date("2026-01-15");
    const result = formatDate(d);
    expect(result).toBeTruthy();
    expect(result).not.toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
  it("returns 'N/A' for falsy input", () => {
    expect(formatDateTime(null)).toBe("N/A");
  });

  it("returns 'Invalid date' for bad input", () => {
    expect(formatDateTime("xyz")).toBe("Invalid date");
  });

  it("formats a valid date with time", () => {
    const result = formatDateTime("2026-02-07T10:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// timeAgo
// ---------------------------------------------------------------------------

describe("timeAgo", () => {
  it("returns 'N/A' for falsy input", () => {
    expect(timeAgo(null)).toBe("N/A");
    expect(timeAgo("")).toBe("N/A");
  });

  it("returns 'Invalid date' for bad input", () => {
    expect(timeAgo("invalid")).toBe("Invalid date");
  });

  it("returns 'Just now' for very recent timestamps", () => {
    const now = new Date();
    expect(timeAgo(now)).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toBe("5 minutes ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    expect(timeAgo(twoHoursAgo)).toBe("2 hours ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000);
    expect(timeAgo(threeDaysAgo)).toBe("3 days ago");
  });
});

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

describe("formatPrice", () => {
  it("returns 'N/A' for null/undefined/NaN", () => {
    expect(formatPrice(null)).toBe("N/A");
    expect(formatPrice(undefined)).toBe("N/A");
    expect(formatPrice("abc")).toBe("N/A");
  });

  it("formats a number as Indian Rupee", () => {
    const result = formatPrice(2250.5);
    expect(result).toContain("Rs");
    expect(result).toContain("2,250");
  });

  it("respects fraction digits parameter", () => {
    const result = formatPrice(1000, 0);
    expect(result).toBe("Rs 1,000");
  });
});

// ---------------------------------------------------------------------------
// formatPricePerQuintal
// ---------------------------------------------------------------------------

describe("formatPricePerQuintal", () => {
  it("returns 'N/A' for null", () => {
    expect(formatPricePerQuintal(null)).toBe("N/A");
  });

  it("appends /qtl suffix", () => {
    const result = formatPricePerQuintal(2250);
    expect(result).toContain("/qtl");
    expect(result).toContain("Rs");
  });
});

// ---------------------------------------------------------------------------
// formatTemperature
// ---------------------------------------------------------------------------

describe("formatTemperature", () => {
  it("returns 'N/A' for null", () => {
    expect(formatTemperature(null)).toBe("N/A");
  });

  it("formats temperature with C suffix", () => {
    expect(formatTemperature(28.5)).toBe("28.5 C");
    expect(formatTemperature(28.5, 0)).toBe("29 C");
  });
});

// ---------------------------------------------------------------------------
// formatPercentage
// ---------------------------------------------------------------------------

describe("formatPercentage", () => {
  it("returns 'N/A' for null", () => {
    expect(formatPercentage(null)).toBe("N/A");
  });

  it("formats percentage without decimal conversion", () => {
    expect(formatPercentage(85)).toBe("85.0%");
  });

  it("converts decimal to percentage when flag is true", () => {
    expect(formatPercentage(0.852, true)).toBe("85.2%");
  });
});

// ---------------------------------------------------------------------------
// String Utilities
// ---------------------------------------------------------------------------

describe("capitalize", () => {
  it("returns empty string for falsy input", () => {
    expect(capitalize("")).toBe("");
    expect(capitalize(null)).toBe("");
  });

  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("WORLD")).toBe("World");
  });
});

describe("titleCase", () => {
  it("returns empty string for falsy input", () => {
    expect(titleCase("")).toBe("");
  });

  it("converts to title case", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });
});

describe("truncate", () => {
  it("returns empty string for falsy input", () => {
    expect(truncate("")).toBe("");
  });

  it("returns original string if within limit", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("truncates with ellipsis", () => {
    const result = truncate("a very long string that exceeds the limit", 10);
    expect(result).toHaveLength(13); // 10 chars + "..."
    expect(result).toMatch(/\.\.\.$/);
  });
});

// ---------------------------------------------------------------------------
// Miscellaneous
// ---------------------------------------------------------------------------

describe("generateId", () => {
  it("generates unique IDs", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("uses prefix", () => {
    const id = generateId("test");
    expect(id).toMatch(/^test_/);
  });
});

describe("debounce", () => {
  it("delays function execution", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe("clamp", () => {
  it("clamps value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("deepClone", () => {
  it("returns primitives as-is", () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone("hello")).toBe("hello");
    expect(deepClone(null)).toBe(null);
  });

  it("deep clones objects", () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = deepClone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it("deep clones arrays", () => {
    const arr = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
  });
});
