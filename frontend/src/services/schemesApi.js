/**
 * Government Schemes API Service
 *
 * Handles all API calls related to government schemes.
 * Uses axios-based api module for consistency with other services.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/schemes`;

/**
 * Get all government schemes with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.scheme_type - Filter by scheme type
 * @param {string} filters.state - Filter by state
 * @param {boolean} filters.is_active - Filter by active status
 * @returns {Promise<Object>} - Schemes data
 */
export async function getAllSchemes(filters = {}) {
  const params = {};
  
  if (filters.scheme_type) {
    params.scheme_type = filters.scheme_type;
  }
  if (filters.state) {
    params.state = filters.state;
  }
  if (filters.is_active !== undefined) {
    params.is_active = filters.is_active;
  }
  
  const { data } = await api.get(BASE, { params });
  return data;
}

/**
 * Get scheme by ID
 * @param {number} schemeId - Scheme ID
 * @returns {Promise<Object>} - Scheme data
 */
export async function getSchemeById(schemeId) {
  const { data } = await api.get(`${BASE}/${schemeId}`);
  return data;
}

/**
 * Get scheme by code
 * @param {string} schemeCode - Scheme code (e.g., PM_KISAN)
 * @returns {Promise<Object>} - Scheme data
 */
export async function getSchemeByCode(schemeCode) {
  const { data } = await api.get(`${BASE}/code/${schemeCode}`);
  return data;
}

/**
 * Get all available scheme types
 * @returns {Promise<Object>} - List of scheme types
 */
export async function getSchemeTypes() {
  const { data } = await api.get(`${BASE}/types/list`);
  return data;
}

/**
 * Get schemes for a specific state (includes national + state-specific)
 * @param {string} state - State name
 * @returns {Promise<Object>} - Schemes data
 */
export async function getSchemesByState(state) {
  return getAllSchemes({ state, is_active: true });
}

/**
 * Get schemes by type
 * @param {string} type - Scheme type
 * @returns {Promise<Object>} - Schemes data
 */
export async function getSchemesByType(type) {
  return getAllSchemes({ scheme_type: type, is_active: true });
}
