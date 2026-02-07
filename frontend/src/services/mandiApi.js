/**
 * Mandi price API service.
 *
 * Connects to backend /api/v1/mandi endpoints:
 * - Commodities list, prices (with filters), compare, best mandi, trends.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/mandi`;

/**
 * List all commodities with summary statistics.
 * @returns {Promise<{ total: number, commodities: Array }>}
 */
export async function getCommodities() {
  const { data } = await api.get(`${BASE}/commodities`);
  return data;
}

/**
 * Get mandi prices with optional filters.
 * @param {{
 *   commodity?: string,
 *   state?: string,
 *   district?: string,
 *   min_price?: number,
 *   max_price?: number,
 *   limit?: number,
 *   offset?: number,
 *   refresh?: boolean
 * }} [params]
 * @returns {Promise<Object>}
 */
export async function getPrices(params = {}) {
  const { data } = await api.get(`${BASE}/prices`, { params });
  return data;
}

/**
 * Compare prices across mandis for a commodity.
 * @param {string} commodity - Commodity name
 * @param {{ mandis?: string, state?: string }} [options]
 * @returns {Promise<Object>}
 */
export async function comparePrices(commodity, options = {}) {
  const params = { commodity };
  if (options.mandis) params.mandis = options.mandis;
  if (options.state) params.state = options.state;

  const { data } = await api.get(`${BASE}/compare`, { params });
  return data;
}

/**
 * Get best mandi recommendation for a commodity.
 * @param {string} commodity - Commodity name
 * @param {{
 *   latitude?: number,
 *   longitude?: number,
 *   max_distance_km?: number,
 *   state?: string
 * }} [options]
 * @returns {Promise<Object>}
 */
export async function getBestMandi(commodity, options = {}) {
  const params = { commodity };
  if (options.latitude != null) params.latitude = options.latitude;
  if (options.longitude != null) params.longitude = options.longitude;
  if (options.max_distance_km != null)
    params.max_distance_km = options.max_distance_km;
  if (options.state) params.state = options.state;

  const { data } = await api.get(`${BASE}/best`, { params });
  return data;
}

/**
 * Get price trends for a commodity.
 * @param {string} commodity - Commodity name
 * @param {{ state?: string, days?: number }} [options]
 * @returns {Promise<Object>}
 */
export async function getTrends(commodity, options = {}) {
  const params = { commodity };
  if (options.state) params.state = options.state;
  if (options.days != null) params.days = options.days;

  const { data } = await api.get(`${BASE}/trends`, { params });
  return data;
}
