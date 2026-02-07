/**
 * LocalStorage wrapper with safe JSON serialization.
 *
 * All read/write operations are wrapped in try/catch to handle
 * environments where localStorage is unavailable (SSR, privacy
 * mode, storage quota exceeded, etc.).
 */

// ---------------------------------------------------------------------------
// Availability Check
// ---------------------------------------------------------------------------

/**
 * Determine whether localStorage is available and writable.
 *
 * @returns {boolean}
 */
function isStorageAvailable() {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = isStorageAvailable();

// ---------------------------------------------------------------------------
// Core Operations
// ---------------------------------------------------------------------------

/**
 * Retrieve a value from localStorage.
 *
 * @param {string} key          - Storage key.
 * @param {*}      defaultValue - Fallback when the key is absent or unreadable.
 * @returns {*} Parsed value or defaultValue.
 */
export function getItem(key, defaultValue = null) {
  if (!storageAvailable) {
    return defaultValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Persist a value to localStorage.
 *
 * @param {string} key   - Storage key.
 * @param {*}      value - Value to store (will be JSON-serialized).
 * @returns {boolean} Whether the write succeeded.
 */
export function setItem(key, value) {
  if (!storageAvailable) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[storage] Failed to write key "${key}":`, err);
    return false;
  }
}

/**
 * Remove a key from localStorage.
 *
 * @param {string} key - Storage key.
 * @returns {boolean} Whether the removal succeeded.
 */
export function removeItem(key) {
  if (!storageAvailable) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all FarmHelp-related entries from localStorage.
 * Only removes keys that start with "farmhelp_".
 *
 * @returns {boolean} Whether the operation succeeded.
 */
export function clearAll() {
  if (!storageAvailable) {
    return false;
  }

  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("farmhelp_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// TTL-Based Cache Operations
// ---------------------------------------------------------------------------

/**
 * Store a value with an expiration timestamp.
 *
 * @param {string} key   - Storage key.
 * @param {*}      value - Value to cache.
 * @param {number} ttlMs - Time-to-live in milliseconds.
 * @returns {boolean} Whether the write succeeded.
 */
export function setWithTTL(key, value, ttlMs) {
  const record = {
    value,
    expiry: Date.now() + ttlMs,
  };
  return setItem(key, record);
}

/**
 * Retrieve a cached value, returning defaultValue if expired or absent.
 *
 * @param {string} key          - Storage key.
 * @param {*}      defaultValue - Fallback when expired or absent.
 * @returns {*} The cached value or defaultValue.
 */
export function getWithTTL(key, defaultValue = null) {
  const record = getItem(key, null);

  if (!record || typeof record !== "object" || !record.expiry) {
    return defaultValue;
  }

  if (Date.now() > record.expiry) {
    removeItem(key);
    return defaultValue;
  }

  return record.value;
}

// ---------------------------------------------------------------------------
// Convenience Export
// ---------------------------------------------------------------------------

const storage = {
  get: getItem,
  set: setItem,
  remove: removeItem,
  clearAll,
  setWithTTL,
  getWithTTL,
};

export default storage;
