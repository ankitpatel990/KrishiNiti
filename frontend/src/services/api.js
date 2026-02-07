/**
 * Axios instance for FarmHelp API.
 *
 * In development, requests to /api/* are proxied to the backend by Vite.
 * Uses relative URLs so the same origin gets the proxy.
 */

import axios from "axios";
import { API_BASE_URL, API_TIMEOUT_MS } from "@utils/constants";

const isDev = import.meta.env.DEV;
const baseURL = isDev ? "" : API_BASE_URL;

const api = axios.create({
  baseURL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.message ||
      "Request failed";
    return Promise.reject(new Error(typeof message === "string" ? message : JSON.stringify(message)));
  }
);

/** Base path for v1 API (used when not using proxy, e.g. in production). */
export const API_V1 = "/api/v1";

/** @param {string} path - Path starting with /api/v1/... */
export function apiUrl(path) {
  if (path.startsWith("http")) return path;
  if (isDev) return path;
  return `${API_BASE_URL}${path}`;
}

export default api;
