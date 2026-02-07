/**
 * APMC price API service.
 *
 * Connects to backend /api/v1/apmc endpoints:
 * - Commodities list, prices (with filters), compare, best APMC, trends.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/apmc`;

/**
 * List all commodities with summary statistics.
 * @returns {Promise<{ total: number, commodities: Array }>}
 */
export async function getCommodities() {
  const { data } = await api.get(`${BASE}/commodities`);
  return data;
}

/**
 * Get APMC prices with optional filters.
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
 * Compare prices across APMCs for a commodity.
 * @param {string} commodity - Commodity name
 * @param {{ apmcs?: string, state?: string }} [options]
 * @returns {Promise<Object>}
 */
export async function comparePrices(commodity, options = {}) {
  const params = { commodity };
  if (options.apmcs) params.apmcs = options.apmcs;
  if (options.state) params.state = options.state;

  const { data } = await api.get(`${BASE}/compare`, { params });
  return data;
}

/**
 * Get best APMC recommendation for a commodity.
 * @param {string} commodity - Commodity name
 * @param {{
 *   latitude?: number,
 *   longitude?: number,
 *   max_distance_km?: number,
 *   state?: string
 * }} [options]
 * @returns {Promise<Object>}
 */
export async function getBestAPMC(commodity, options = {}) {
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

/**
 * Get sell advisory with storage vs immediate sell recommendation.
 * @param {string} commodity - Commodity name
 * @param {{ current_price?: number, state?: string }} [options]
 * @returns {Promise<Object>}
 */
export async function getSellAdvisory(commodity, options = {}) {
  const params = { commodity };
  if (options.current_price != null) params.current_price = options.current_price;
  if (options.state) params.state = options.state;

  const { data } = await api.get(`${BASE}/sell-advisory`, { params });
  return data;
}
