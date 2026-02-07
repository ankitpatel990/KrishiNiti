/**
 * Input validation functions.
 *
 * Each validator returns an object with:
 *   { valid: boolean, message: string }
 *
 * This pattern allows consistent form-level and field-level validation
 * across all components.
 */

import { PINCODE_PATTERN, SUPPORTED_CROPS } from "./constants";

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid   - Whether the value is valid.
 * @property {string}  message - Human-readable validation message.
 */

// ---------------------------------------------------------------------------
// Pincode Validation
// ---------------------------------------------------------------------------

/**
 * Validate a 6-digit Indian pincode.
 *
 * @param {string} pincode - The pincode string to validate.
 * @returns {ValidationResult}
 */
export function validatePincode(pincode) {
  if (!pincode || typeof pincode !== "string") {
    return { valid: false, message: "Pincode is required." };
  }

  const trimmed = pincode.trim();

  if (trimmed.length !== 6) {
    return { valid: false, message: "Pincode must be exactly 6 digits." };
  }

  if (!PINCODE_PATTERN.test(trimmed)) {
    return { valid: false, message: "Pincode must contain only digits." };
  }

  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Crop Type Validation
// ---------------------------------------------------------------------------

/**
 * Validate a crop type against the supported list.
 *
 * @param {string} cropType - The crop type to validate.
 * @returns {ValidationResult}
 */
export function validateCropType(cropType) {
  if (!cropType || typeof cropType !== "string") {
    return { valid: false, message: "Crop type is required." };
  }

  const normalized = cropType.trim();

  if (normalized.length === 0) {
    return { valid: false, message: "Crop type cannot be empty." };
  }

  const match = SUPPORTED_CROPS.find(
    (c) => c.toLowerCase() === normalized.toLowerCase(),
  );

  if (!match) {
    return {
      valid: false,
      message: `Unsupported crop type. Supported: ${SUPPORTED_CROPS.join(", ")}.`,
    };
  }

  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Disease Name Validation
// ---------------------------------------------------------------------------

/**
 * Validate a disease name query.
 *
 * @param {string} diseaseName - Disease name string.
 * @returns {ValidationResult}
 */
export function validateDiseaseName(diseaseName) {
  if (!diseaseName || typeof diseaseName !== "string") {
    return { valid: false, message: "Disease name is required." };
  }

  const trimmed = diseaseName.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: "Disease name cannot be empty." };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      message: "Disease name must be 200 characters or fewer.",
    };
  }

  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Commodity Validation
// ---------------------------------------------------------------------------

/**
 * Validate a commodity name.
 *
 * @param {string} commodity - Commodity name string.
 * @returns {ValidationResult}
 */
export function validateCommodity(commodity) {
  if (!commodity || typeof commodity !== "string") {
    return { valid: false, message: "Commodity name is required." };
  }

  const trimmed = commodity.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: "Commodity name cannot be empty." };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      message: "Commodity name must be 100 characters or fewer.",
    };
  }

  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Acres Validation
// ---------------------------------------------------------------------------

/**
 * Validate an acreage value.
 *
 * @param {number|string} acres - Acreage value.
 * @returns {ValidationResult}
 */
export function validateAcres(acres) {
  const num = Number(acres);

  if (acres === null || acres === undefined || acres === "") {
    return { valid: false, message: "Acreage is required." };
  }

  if (Number.isNaN(num)) {
    return { valid: false, message: "Acreage must be a valid number." };
  }

  if (num < 0.1) {
    return { valid: false, message: "Acreage must be at least 0.1." };
  }

  if (num > 10000) {
    return { valid: false, message: "Acreage must be 10,000 or fewer." };
  }

  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Image File Validation
// ---------------------------------------------------------------------------

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validate an image file for disease detection upload.
 *
 * @param {File} file - File object from an input element.
 * @returns {ValidationResult}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, message: "An image file is required." };
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      message: "Image must be JPEG, PNG, or WebP format.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      message: "Image must be smaller than 10 MB.",
    };
  }

  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Latitude / Longitude
// ---------------------------------------------------------------------------

/**
 * Validate latitude value.
 *
 * @param {number|string} lat - Latitude.
 * @returns {ValidationResult}
 */
export function validateLatitude(lat) {
  const num = Number(lat);
  if (lat === null || lat === undefined || lat === "") {
    return { valid: false, message: "Latitude is required." };
  }
  if (Number.isNaN(num) || num < -90 || num > 90) {
    return { valid: false, message: "Latitude must be between -90 and 90." };
  }
  return { valid: true, message: "" };
}

/**
 * Validate longitude value.
 *
 * @param {number|string} lon - Longitude.
 * @returns {ValidationResult}
 */
export function validateLongitude(lon) {
  const num = Number(lon);
  if (lon === null || lon === undefined || lon === "") {
    return { valid: false, message: "Longitude is required." };
  }
  if (Number.isNaN(num) || num < -180 || num > 180) {
    return {
      valid: false,
      message: "Longitude must be between -180 and 180.",
    };
  }
  return { valid: true, message: "" };
}
