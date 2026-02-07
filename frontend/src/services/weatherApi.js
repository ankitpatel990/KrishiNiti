/**
 * Weather API service.
 *
 * Connects to backend /api/v1/weather endpoints:
 * - Forecast by pincode, farming alerts.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/weather`;

/**
 * Get 7-day weather forecast for a pincode.
 * @param {string} pincode - 6-digit Indian pincode
 * @returns {Promise<Object>}
 */
export async function getForecast(pincode) {
  const { data } = await api.get(`${BASE}/forecast`, {
    params: { pincode: String(pincode).trim() },
  });
  return data;
}

/**
 * Get farming alerts based on weather for a pincode.
 * @param {string} pincode - 6-digit Indian pincode
 * @param {{ cropType?: string }} [options]
 * @returns {Promise<Object>}
 */
export async function getAlerts(pincode, options = {}) {
  const params = { pincode: String(pincode).trim() };
  if (options.cropType) params.crop_type = options.cropType;

  const { data } = await api.get(`${BASE}/alerts`, { params });
  return data;
}
