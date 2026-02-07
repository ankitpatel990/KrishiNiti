/**
 * Toast - Notification utility wrapping react-hot-toast.
 *
 * Provides typed helper functions for consistent toast notifications
 * throughout the application. The Toaster component is already rendered
 * in main.jsx; this module only provides the trigger functions.
 *
 * Usage:
 *   import { showSuccess, showError, showInfo } from "@components/common/Toast";
 *   showSuccess("Record saved successfully.");
 *   showError("Failed to fetch data.");
 *   showInfo("New version available.");
 */

import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Show a success toast notification.
 *
 * @param {string} message  - Notification text.
 * @param {object} [options] - react-hot-toast options override.
 * @returns {string} Toast ID.
 */
export function showSuccess(message, options = {}) {
  return toast.success(message, {
    duration: 4000,
    ...options,
  });
}

/**
 * Show an error toast notification.
 *
 * @param {string} message  - Notification text.
 * @param {object} [options] - react-hot-toast options override.
 * @returns {string} Toast ID.
 */
export function showError(message, options = {}) {
  return toast.error(message, {
    duration: 5000,
    ...options,
  });
}

/**
 * Show an informational toast notification.
 *
 * @param {string} message  - Notification text.
 * @param {object} [options] - react-hot-toast options override.
 * @returns {string} Toast ID.
 */
export function showInfo(message, options = {}) {
  return toast(message, {
    duration: 4000,
    icon: "\u2139\uFE0F",
    style: {
      borderLeft: "4px solid #0ea5e9",
    },
    ...options,
  });
}

/**
 * Show a warning toast notification.
 *
 * @param {string} message  - Notification text.
 * @param {object} [options] - react-hot-toast options override.
 * @returns {string} Toast ID.
 */
export function showWarning(message, options = {}) {
  return toast(message, {
    duration: 5000,
    icon: "\u26A0\uFE0F",
    style: {
      borderLeft: "4px solid #f59e0b",
    },
    ...options,
  });
}

/**
 * Show a loading toast that can be updated later.
 *
 * @param {string} message  - Loading text.
 * @returns {string} Toast ID (use with toast.dismiss or toast.success to update).
 */
export function showLoading(message) {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast by ID, or all toasts if no ID is provided.
 *
 * @param {string} [toastId] - Toast ID to dismiss.
 */
export function dismissToast(toastId) {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
}

/**
 * Promise-based toast that shows loading, success, and error states.
 *
 * @param {Promise} promise - The promise to track.
 * @param {{ loading: string, success: string, error: string }} messages - Status messages.
 * @param {object} [options] - react-hot-toast options override.
 * @returns {Promise} The original promise.
 */
export function showPromise(promise, messages, options = {}) {
  return toast.promise(promise, messages, options);
}
