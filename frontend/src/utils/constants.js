/**
 * Application-wide constants.
 *
 * All magic values, default limits, and static look-up tables
 * used across the frontend are centralized here.
 */

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const API_PREFIX = "/api";

export const API_TIMEOUT_MS = 15000;

export const API_RETRY_COUNT = 2;

export const API_RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Application Metadata
// ---------------------------------------------------------------------------

export const APP_NAME = import.meta.env.VITE_APP_NAME || "FarmHelp";

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// ---------------------------------------------------------------------------
// Cache Durations (milliseconds)
// ---------------------------------------------------------------------------

export const WEATHER_CACHE_DURATION_MS = Number(
  import.meta.env.VITE_WEATHER_CACHE_DURATION_MS || 300000,
);

export const APMC_CACHE_DURATION_MS = Number(
  import.meta.env.VITE_APMC_CACHE_DURATION_MS || 600000,
);

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------

export const FEATURES = {
  VOICE_ENABLED: import.meta.env.VITE_ENABLE_VOICE !== "false",
  OFFLINE_ENABLED: import.meta.env.VITE_ENABLE_OFFLINE === "true",
};

// ---------------------------------------------------------------------------
// Supported Crop Types (mirrors backend)
// ---------------------------------------------------------------------------

export const SUPPORTED_CROPS = [
  "Paddy",
  "Wheat",
  "Cotton",
  "Sugarcane",
  "Groundnut",
  "Cumin",
  "Tomato",
  "Potato",
  "Onion",
  "Chilli",
  "Maize",
  "Pulses",
  "Oilseeds",
  "Millets",
];

// ---------------------------------------------------------------------------
// Alert Severity Levels
// ---------------------------------------------------------------------------

export const SEVERITY_LEVELS = {
  INFO: "info",
  WARNING: "warning",
  DANGER: "danger",
};

export const SEVERITY_ORDER = {
  info: 0,
  warning: 1,
  danger: 2,
};

// ---------------------------------------------------------------------------
// Pagination Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 50;

export const MAX_PAGE_SIZE = 200;

// ---------------------------------------------------------------------------
// Pincode
// ---------------------------------------------------------------------------

export const PINCODE_LENGTH = 6;

export const PINCODE_PATTERN = /^\d{6}$/;

// ---------------------------------------------------------------------------
// TensorFlow.js Model
// ---------------------------------------------------------------------------

export const MODEL_PATH = import.meta.env.VITE_MODEL_PATH || "/models";

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export const LANGUAGES = {
  EN: "en",
  HI: "hi",
};

export const DEFAULT_LANGUAGE = LANGUAGES.EN;

// ---------------------------------------------------------------------------
// Local Storage Keys
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  LANGUAGE: "farmhelp_language",
  PINCODE: "farmhelp_pincode",
  LOCATION: "farmhelp_location",
  RECENT_SEARCHES: "farmhelp_recent_searches",
  RECENT_ACTIVITY: "farmhelp_recent_activity",
  THEME: "farmhelp_theme",
  USER_PREFERENCES: "farmhelp_preferences",
  VOICE_SETTINGS: "farmhelp_voice_settings",
  VOICE_TUTORIAL_SHOWN: "farmhelp_voice_tutorial_shown",
  VOICE_CHAT_HISTORY: "farmhelp_voice_chat_history",
};

// ---------------------------------------------------------------------------
// Routes (frontend)
// ---------------------------------------------------------------------------

export const ROUTES = {
  HOME: "/",
  DISEASE_DETECTION: "/disease",
  WEATHER: "/weather",
  APMC: "/apmc",
  SCHEMES: "/schemes",
};

// ---------------------------------------------------------------------------
// HTTP Status Codes (commonly referenced)
// ---------------------------------------------------------------------------

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
