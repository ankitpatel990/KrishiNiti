/**
 * Government Schemes API Service
 *
 * Handles all API calls related to government schemes.
 */

import { API_BASE_URL, API_PREFIX } from "@utils/constants";

const SCHEMES_BASE_URL = `${API_BASE_URL}${API_PREFIX}`;

/**
 * Get all government schemes with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.scheme_type - Filter by scheme type
 * @param {string} filters.state - Filter by state
 * @param {boolean} filters.is_active - Filter by active status
 * @returns {Promise<Object>} - Schemes data
 */
export async function getAllSchemes(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.scheme_type) {
      params.append("scheme_type", filters.scheme_type);
    }
    if (filters.state) {
      params.append("state", filters.state);
    }
    if (filters.is_active !== undefined) {
      params.append("is_active", filters.is_active);
    }
    
    const url = `${SCHEMES_BASE_URL}/schemes${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching schemes:", error);
    throw error;
  }
}

/**
 * Get scheme by ID
 * @param {number} schemeId - Scheme ID
 * @returns {Promise<Object>} - Scheme data
 */
export async function getSchemeById(schemeId) {
  try {
    const response = await fetch(`${SCHEMES_BASE_URL}/schemes/${schemeId}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching scheme ${schemeId}:`, error);
    throw error;
  }
}

/**
 * Get scheme by code
 * @param {string} schemeCode - Scheme code (e.g., PM_KISAN)
 * @returns {Promise<Object>} - Scheme data
 */
export async function getSchemeByCode(schemeCode) {
  try {
    const response = await fetch(`${SCHEMES_BASE_URL}/schemes/code/${schemeCode}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching scheme by code ${schemeCode}:`, error);
    throw error;
  }
}

/**
 * Get all available scheme types
 * @returns {Promise<Object>} - List of scheme types
 */
export async function getSchemeTypes() {
  try {
    const response = await fetch(`${SCHEMES_BASE_URL}/schemes/types/list`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching scheme types:", error);
    throw error;
  }
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
