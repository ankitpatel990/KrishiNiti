/**
 * Disease API service.
 *
 * Connects to backend /api/v1/disease endpoints:
 * - Treatment by name, list, detect (AI image), get by ID,
 *   supported crops, model status.
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
 * AI disease detection from an uploaded image.
 *
 * @param {File} imageFile  - Image file (JPEG, PNG, WebP).
 * @param {string} cropType - User-selected crop type.
 * @returns {Promise<Object>} Response with predictions array.
 */
export async function detectDiseaseWithImage(imageFile, cropType) {
  const formData = new FormData();
  formData.append("image", imageFile);

  // Add timestamp to prevent any browser/proxy caching
  const params = new URLSearchParams({
    crop_type: cropType,
    _t: Date.now().toString(),
  });

  const { data } = await api.post(
    `${BASE}/detect?${params.toString()}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      timeout: 120_000,
    },
  );
  return data;
}

/**
 * Get the list of crops supported by AI detection models.
 * @returns {Promise<{ crops: Array<{ value: string, label: string, model: string }> }>}
 */
export async function getSupportedCrops() {
  const { data } = await api.get(`${BASE}/supported-crops`);
  return data;
}

/**
 * Get AI model loading status.
 * @returns {Promise<Object>}
 */
export async function getModelStatus() {
  const { data } = await api.get(`${BASE}/model-status`);
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
