/**
 * Weather API service.
 *
 * Connects to backend /api/v1/weather endpoints:
 * - Forecast by taluka, farming alerts.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/weather`;

/**
 * Get 7-day weather forecast for a taluka.
 * @param {{ state: string, district: string, taluka: string }} location
 * @returns {Promise<Object>}
 */
export async function getForecast(location) {
  const { data } = await api.get(`${BASE}/forecast`, {
    params: {
      state: location.state,
      district: location.district,
      taluka: location.taluka,
    },
  });
  return data;
}

/**
 * Get farming alerts based on weather for a taluka.
 * @param {{ state: string, district: string, taluka: string }} location
 * @param {{ cropType?: string }} [options]
 * @returns {Promise<Object>}
 */
export async function getAlerts(location, options = {}) {
  const params = {
    state: location.state,
    district: location.district,
    taluka: location.taluka,
  };
  if (options.cropType) params.crop_type = options.cropType;

  const { data } = await api.get(`${BASE}/alerts`, { params });
  return data;
}
