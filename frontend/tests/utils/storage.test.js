/**
 * Unit tests for src/utils/storage.js
 */

import { describe, it, expect, beforeEach } from "vitest";
import storage from "../../src/utils/storage";

beforeEach(() => {
  window.localStorage.clear();
});

// ---------------------------------------------------------------------------
// Basic CRUD
// ---------------------------------------------------------------------------

describe("storage.get / storage.set", () => {
  it("returns default value when key does not exist", () => {
    expect(storage.get("nonexistent", "fallback")).toBe("fallback");
  });

  it("stores and retrieves a string", () => {
    storage.set("key1", "value1");
    expect(storage.get("key1")).toBe("value1");
  });

  it("stores and retrieves an object", () => {
    const obj = { a: 1, b: [2, 3] };
    storage.set("key2", obj);
    expect(storage.get("key2")).toEqual(obj);
  });

  it("stores and retrieves a number", () => {
    storage.set("key3", 42);
    expect(storage.get("key3")).toBe(42);
  });

  it("stores and retrieves a boolean", () => {
    storage.set("key4", true);
    expect(storage.get("key4")).toBe(true);
  });

  it("stores and retrieves null", () => {
    storage.set("key5", null);
    expect(storage.get("key5")).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------

describe("storage.remove", () => {
  it("removes a key", () => {
    storage.set("toRemove", "data");
    expect(storage.get("toRemove")).toBe("data");

    storage.remove("toRemove");
    expect(storage.get("toRemove")).toBe(null);
  });

  it("returns true on success", () => {
    storage.set("toRemove2", "data");
    expect(storage.remove("toRemove2")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// clearAll (farmhelp_ prefix only)
// ---------------------------------------------------------------------------

describe("storage.clearAll", () => {
  it("clears only farmhelp_ prefixed keys", () => {
    storage.set("farmhelp_lang", "en");
    storage.set("farmhelp_theme", "dark");
    window.localStorage.setItem("other_key", "keep");

    storage.clearAll();

    expect(storage.get("farmhelp_lang")).toBe(null);
    expect(storage.get("farmhelp_theme")).toBe(null);
    expect(window.localStorage.getItem("other_key")).toBe("keep");
  });
});

// ---------------------------------------------------------------------------
// TTL-based operations
// ---------------------------------------------------------------------------

describe("storage.setWithTTL / storage.getWithTTL", () => {
  it("stores and retrieves a value within TTL", () => {
    storage.setWithTTL("cached", "data", 60000);
    expect(storage.getWithTTL("cached")).toBe("data");
  });

  it("returns default when TTL has expired", () => {
    // Manually create an expired record
    const expired = {
      value: "stale",
      expiry: Date.now() - 1000,
    };
    window.localStorage.setItem("expired_key", JSON.stringify(expired));

    expect(storage.getWithTTL("expired_key", "default")).toBe("default");
  });

  it("returns default for non-existent keys", () => {
    expect(storage.getWithTTL("no_such_key", "fallback")).toBe("fallback");
  });

  it("returns default for malformed records", () => {
    window.localStorage.setItem("bad_record", JSON.stringify({ value: "x" }));
    expect(storage.getWithTTL("bad_record", "fallback")).toBe("fallback");
  });
});
