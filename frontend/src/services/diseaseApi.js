/**
 * Disease API service.
 *
 * Connects to backend /api/v1/disease endpoints:
 * - Treatment by name, list, detect (simulated), get by ID.
 */

import api, { API_V1 } from "./api";

const BASE = `${API_V1}/disease`;

/**
 * Get treatment recommendation by disease name.
 * @param {string} diseaseName - Disease name (English or Hindi)
 * @param {{ cropType?: string, acres?: number }} [options]
 * @returns {Promise<Object>}
 */
export async function getTreatment(diseaseName, options = {}) {
  const params = new URLSearchParams({ disease_name: diseaseName });
  if (options.cropType) params.set("crop_type", options.cropType);
  if (options.acres != null) params.set("acres", String(options.acres));

  const { data } = await api.post(`${BASE}/treatment?${params.toString()}`);
  return data;
}

/**
 * Simulated disease detection by crop type.
 * @param {string} cropType - Crop type (e.g. Paddy, Wheat)
 * @returns {Promise<Object>}
 */
export async function detectDisease(cropType) {
  const params = new URLSearchParams({ crop_type: cropType });
  const { data } = await api.post(`${BASE}/detect?${params.toString()}`);
  return data;
}

/**
 * List diseases with optional filters.
 * @param {{ cropType?: string, limit?: number, offset?: number }} [params]
 * @returns {Promise<{ total: number, diseases: Array }>}
 */
export async function listDiseases(params = {}) {
  const search = new URLSearchParams();
  if (params.cropType) search.set("crop_type", params.cropType);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));

  const q = search.toString();
  const { data } = await api.get(`${BASE}/list${q ? `?${q}` : ""}`);
  return data;
}

/**
 * Get disease details by ID.
 * @param {number} diseaseId
 * @returns {Promise<Object>}
 */
export async function getDiseaseById(diseaseId) {
  const { data } = await api.get(`${BASE}/${diseaseId}`);
  return data;
}
