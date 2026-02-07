/**
 * Activity Tracker - Records and retrieves recent user actions.
 *
 * Activities are stored in localStorage with a configurable maximum
 * count. Each entry includes a type, description, timestamp, and
 * optional metadata. Components call `trackActivity()` to log
 * actions; the HomePage reads them via `getRecentActivities()`.
 */

import storage from "./storage";

const STORAGE_KEY = "farmhelp_recent_activity";
const MAX_ACTIVITIES = 20;

/**
 * @typedef {Object} Activity
 * @property {string} id          - Unique identifier.
 * @property {string} type        - Activity type (disease, weather, apmc, voice, search).
 * @property {string} title       - Short title.
 * @property {string} description - Human-readable description.
 * @property {string} timestamp   - ISO 8601 timestamp.
 * @property {string} [route]     - Optional route for navigation.
 * @property {Object} [meta]      - Optional metadata.
 */

/**
 * Track a user activity.
 *
 * @param {Object} params
 * @param {string} params.type        - Activity category.
 * @param {string} params.title       - Short title.
 * @param {string} params.description - Description text.
 * @param {string} [params.route]     - Optional route to navigate.
 * @param {Object} [params.meta]      - Optional extra data.
 */
export function trackActivity({ type, title, description, route, meta }) {
  const activities = storage.get(STORAGE_KEY, []);

  const entry = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
    route: route || null,
    meta: meta || null,
  };

  const updated = [entry, ...activities].slice(0, MAX_ACTIVITIES);
  storage.set(STORAGE_KEY, updated);

  return entry;
}

/**
 * Retrieve recent activities.
 *
 * @param {number} [limit=10] - Maximum number of activities to return.
 * @returns {Activity[]} Array of recent activities (newest first).
 */
export function getRecentActivities(limit = 10) {
  const activities = storage.get(STORAGE_KEY, []);
  return activities.slice(0, limit);
}

/**
 * Clear all stored activities.
 */
export function clearActivities() {
  storage.remove(STORAGE_KEY);
}

/**
 * Activity type constants.
 */
export const ACTIVITY_TYPES = {
  DISEASE: "disease",
  WEATHER: "weather",
  APMC: "apmc",
  VOICE: "voice",
  SEARCH: "search",
};
