/**
 * Vitest global test setup.
 *
 * Provides common mocks for browser APIs not available in the
 * Node test environment (localStorage, matchMedia, etc.).
 */

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] ?? null,
  };
})();

// Provide a minimal window/globalThis shim for Node environment
if (typeof window === "undefined") {
  globalThis.window = globalThis;
}

Object.defineProperty(globalThis.window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(globalThis.window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Reset localStorage between tests
beforeEach(() => {
  globalThis.window.localStorage.clear();
});
