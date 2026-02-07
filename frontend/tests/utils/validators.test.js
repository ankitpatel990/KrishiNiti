/**
 * Unit tests for src/utils/validators.js
 */

import { describe, it, expect } from "vitest";
import {
  validatePincode,
  validateCropType,
  validateDiseaseName,
  validateCommodity,
  validateAcres,
  validateImageFile,
  validateLatitude,
  validateLongitude,
} from "../../src/utils/validators";

// ---------------------------------------------------------------------------
// validatePincode
// ---------------------------------------------------------------------------

describe("validatePincode", () => {
  it("rejects null/undefined/empty", () => {
    expect(validatePincode(null).valid).toBe(false);
    expect(validatePincode(undefined).valid).toBe(false);
    expect(validatePincode("").valid).toBe(false);
  });

  it("rejects non-6-digit values", () => {
    expect(validatePincode("123").valid).toBe(false);
    expect(validatePincode("1234567").valid).toBe(false);
    expect(validatePincode("12345").valid).toBe(false);
  });

  it("rejects non-numeric values", () => {
    expect(validatePincode("12345a").valid).toBe(false);
    expect(validatePincode("abcdef").valid).toBe(false);
  });

  it("accepts valid 6-digit pincodes", () => {
    expect(validatePincode("110001").valid).toBe(true);
    expect(validatePincode("400001").valid).toBe(true);
    expect(validatePincode("700001").valid).toBe(true);
  });

  it("returns empty message for valid input", () => {
    expect(validatePincode("110001").message).toBe("");
  });
});

// ---------------------------------------------------------------------------
// validateCropType
// ---------------------------------------------------------------------------

describe("validateCropType", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateCropType(null).valid).toBe(false);
    expect(validateCropType("").valid).toBe(false);
    expect(validateCropType("   ").valid).toBe(false);
  });

  it("rejects unsupported crop types", () => {
    const result = validateCropType("Mango");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Unsupported");
  });

  it("accepts supported crop types (case insensitive)", () => {
    expect(validateCropType("Paddy").valid).toBe(true);
    expect(validateCropType("wheat").valid).toBe(true);
    expect(validateCropType("TOMATO").valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateDiseaseName
// ---------------------------------------------------------------------------

describe("validateDiseaseName", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateDiseaseName(null).valid).toBe(false);
    expect(validateDiseaseName("").valid).toBe(false);
  });

  it("rejects names exceeding 200 characters", () => {
    const longName = "a".repeat(201);
    expect(validateDiseaseName(longName).valid).toBe(false);
  });

  it("accepts valid disease names", () => {
    expect(validateDiseaseName("Leaf Blight").valid).toBe(true);
    expect(validateDiseaseName("Powdery Mildew").valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateCommodity
// ---------------------------------------------------------------------------

describe("validateCommodity", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateCommodity(null).valid).toBe(false);
    expect(validateCommodity("").valid).toBe(false);
  });

  it("rejects names exceeding 100 characters", () => {
    const longName = "x".repeat(101);
    expect(validateCommodity(longName).valid).toBe(false);
  });

  it("accepts valid commodity names", () => {
    expect(validateCommodity("Wheat").valid).toBe(true);
    expect(validateCommodity("Basmati Rice").valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAcres
// ---------------------------------------------------------------------------

describe("validateAcres", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateAcres(null).valid).toBe(false);
    expect(validateAcres(undefined).valid).toBe(false);
    expect(validateAcres("").valid).toBe(false);
  });

  it("rejects NaN", () => {
    expect(validateAcres("abc").valid).toBe(false);
  });

  it("rejects values below minimum (0.1)", () => {
    expect(validateAcres(0).valid).toBe(false);
    expect(validateAcres(0.05).valid).toBe(false);
  });

  it("rejects values above maximum (10000)", () => {
    expect(validateAcres(10001).valid).toBe(false);
  });

  it("accepts valid acreage values", () => {
    expect(validateAcres(0.1).valid).toBe(true);
    expect(validateAcres(5).valid).toBe(true);
    expect(validateAcres(10000).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateImageFile
// ---------------------------------------------------------------------------

describe("validateImageFile", () => {
  it("rejects null", () => {
    expect(validateImageFile(null).valid).toBe(false);
  });

  it("rejects unsupported file types", () => {
    const file = { type: "application/pdf", size: 1024 };
    expect(validateImageFile(file).valid).toBe(false);
  });

  it("rejects files exceeding 10 MB", () => {
    const file = { type: "image/jpeg", size: 11 * 1024 * 1024 };
    expect(validateImageFile(file).valid).toBe(false);
  });

  it("accepts valid image files", () => {
    const jpeg = { type: "image/jpeg", size: 1024 * 500 };
    const png = { type: "image/png", size: 1024 * 200 };
    const webp = { type: "image/webp", size: 1024 * 100 };

    expect(validateImageFile(jpeg).valid).toBe(true);
    expect(validateImageFile(png).valid).toBe(true);
    expect(validateImageFile(webp).valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateLatitude / validateLongitude
// ---------------------------------------------------------------------------

describe("validateLatitude", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateLatitude(null).valid).toBe(false);
    expect(validateLatitude("").valid).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(validateLatitude(-91).valid).toBe(false);
    expect(validateLatitude(91).valid).toBe(false);
  });

  it("accepts valid latitudes", () => {
    expect(validateLatitude(0).valid).toBe(true);
    expect(validateLatitude(28.6139).valid).toBe(true);
    expect(validateLatitude(-90).valid).toBe(true);
    expect(validateLatitude(90).valid).toBe(true);
  });
});

describe("validateLongitude", () => {
  it("rejects null/undefined/empty", () => {
    expect(validateLongitude(null).valid).toBe(false);
    expect(validateLongitude("").valid).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(validateLongitude(-181).valid).toBe(false);
    expect(validateLongitude(181).valid).toBe(false);
  });

  it("accepts valid longitudes", () => {
    expect(validateLongitude(0).valid).toBe(true);
    expect(validateLongitude(77.209).valid).toBe(true);
    expect(validateLongitude(-180).valid).toBe(true);
    expect(validateLongitude(180).valid).toBe(true);
  });
});
