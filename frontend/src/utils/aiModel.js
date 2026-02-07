/**
 * AI Model Service
 *
 * Provides client-side crop disease detection using TensorFlow.js.
 *
 * Architecture:
 *   1. Attempts to load a custom PlantVillage-style model from /models/model.json.
 *   2. If unavailable, falls back to a deterministic mock inference that
 *      analyses the uploaded image's pixel data to produce consistent,
 *      image-dependent predictions from the local disease database.
 *   3. All results are mapped through the disease knowledge base
 *      (diseaseDatabase.js) so the caller always receives full treatment info.
 *
 * Exported API:
 *   - loadModel()          : Pre-load / warm the TF model (cached).
 *   - analyzeImage(file)   : Full pipeline: preprocess -> infer -> post-process.
 *   - getModelStatus()     : Current model loading state.
 *   - resetModel()         : Free memory and reset cache.
 *
 * The module keeps a singleton model reference to avoid re-downloading
 * on every analysis request.
 */

import * as tf from "@tensorflow/tfjs";
import { MODEL_PATH } from "./constants";
import { getDiseaseByClassIndex, NUM_CLASSES } from "./diseaseDatabase";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Expected model input dimensions (width x height). */
const MODEL_INPUT_SIZE = 224;

/** Minimum confidence to include a prediction in results. */
const CONFIDENCE_THRESHOLD = 0.10;

/** Maximum predictions to return. */
const MAX_PREDICTIONS = 3;

/** Stages reported during analysis for progress tracking. */
export const ANALYSIS_STAGES = {
  IDLE: "idle",
  LOADING_MODEL: "loading_model",
  PREPROCESSING: "preprocessing",
  RUNNING_INFERENCE: "running_inference",
  POSTPROCESSING: "postprocessing",
  COMPLETE: "complete",
  ERROR: "error",
};

// ---------------------------------------------------------------------------
// Module-level singleton state
// ---------------------------------------------------------------------------

let cachedModel = null;
let modelLoadPromise = null;
let modelStatus = {
  loaded: false,
  loading: false,
  error: null,
  usingMock: false,
};

// ---------------------------------------------------------------------------
// Model Loading
// ---------------------------------------------------------------------------

/**
 * Load and cache the TF.js model.
 *
 * On first call, attempts to load from MODEL_PATH/model.json.
 * Subsequent calls return the cached model immediately.
 * If loading fails, sets `usingMock = true` and the inference
 * pipeline will use deterministic mock analysis.
 *
 * @param {function} [onProgress] - Optional progress callback (0-1).
 * @returns {Promise<{ loaded: boolean, usingMock: boolean }>}
 */
export async function loadModel(onProgress) {
  // Return cached model if available
  if (cachedModel) {
    return { loaded: true, usingMock: false };
  }

  // If a load is already in flight, wait for it
  if (modelLoadPromise) {
    return modelLoadPromise;
  }

  modelStatus = { loaded: false, loading: true, error: null, usingMock: false };

  modelLoadPromise = (async () => {
    try {
      const modelUrl = `${MODEL_PATH}/model.json`;

      cachedModel = await tf.loadLayersModel(modelUrl, {
        onProgress: (fraction) => {
          if (typeof onProgress === "function") {
            onProgress(fraction);
          }
        },
      });

      // Warm-up inference with a dummy tensor to compile shaders/WASM
      const warmup = tf.zeros([1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, 3]);
      const warmupResult = cachedModel.predict(warmup);
      warmup.dispose();
      if (warmupResult.dispose) warmupResult.dispose();

      modelStatus = { loaded: true, loading: false, error: null, usingMock: false };
      return { loaded: true, usingMock: false };
    } catch (err) {
      cachedModel = null;
      modelStatus = {
        loaded: false,
        loading: false,
        error: err.message || "Failed to load AI model",
        usingMock: true,
      };
      return { loaded: false, usingMock: true };
    } finally {
      modelLoadPromise = null;
    }
  })();

  return modelLoadPromise;
}

// ---------------------------------------------------------------------------
// Image Preprocessing
// ---------------------------------------------------------------------------

/**
 * Convert a File/Blob to an HTMLImageElement.
 *
 * @param {File|Blob} file - Image file.
 * @returns {Promise<HTMLImageElement>}
 */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image file."));
    };
    img.src = url;
  });
}

/**
 * Preprocess an image for model input.
 *
 * Steps:
 *   1. Decode the File into an HTMLImageElement
 *   2. Convert to a tensor and resize to MODEL_INPUT_SIZE x MODEL_INPUT_SIZE
 *   3. Normalize pixel values from [0, 255] to [0, 1]
 *   4. Expand dimensions to create a batch of size 1
 *
 * @param {File} file - Uploaded image file.
 * @returns {Promise<{ tensor: tf.Tensor, imageElement: HTMLImageElement }>}
 */
async function preprocessImage(file) {
  const img = await fileToImage(file);

  const tensor = tf.tidy(() => {
    const rawTensor = tf.browser.fromPixels(img);

    const resized = tf.image.resizeBilinear(
      rawTensor,
      [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE],
    );

    const normalized = resized.div(255.0);

    return normalized.expandDims(0);
  });

  return { tensor, imageElement: img };
}

// ---------------------------------------------------------------------------
// Real Model Inference
// ---------------------------------------------------------------------------

/**
 * Run inference on a preprocessed tensor using the loaded TF.js model.
 *
 * @param {tf.Tensor} inputTensor - Preprocessed [1, 224, 224, 3] tensor.
 * @returns {Promise<Array<{ classIndex: number, confidence: number }>>}
 */
async function runModelInference(inputTensor) {
  const outputTensor = cachedModel.predict(inputTensor);
  const probabilities = await outputTensor.data();
  outputTensor.dispose();

  const predictions = Array.from(probabilities)
    .map((confidence, classIndex) => ({ classIndex, confidence }))
    .filter((p) => p.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_PREDICTIONS);

  return predictions;
}

// ---------------------------------------------------------------------------
// Mock Inference (deterministic, image-dependent)
// ---------------------------------------------------------------------------

/**
 * Compute a simple hash from image pixel data to produce
 * deterministic but image-dependent mock predictions.
 *
 * This ensures the same image always produces the same result,
 * making the mock feel realistic for demo and testing purposes.
 *
 * @param {HTMLImageElement} img - Decoded image element.
 * @returns {number} Hash value.
 */
function computeImageHash(img) {
  const canvas = document.createElement("canvas");
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  let hash = 0;
  for (let i = 0; i < data.length; i += 4) {
    hash = ((hash << 5) - hash + data[i]) | 0;
    hash = ((hash << 5) - hash + data[i + 1]) | 0;
    hash = ((hash << 5) - hash + data[i + 2]) | 0;
  }

  return Math.abs(hash);
}

/**
 * Compute average colour channel values for green-detection heuristic.
 *
 * @param {HTMLImageElement} img - Decoded image element.
 * @returns {{ r: number, g: number, b: number }}
 */
function computeAverageColor(img) {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  let r = 0;
  let g = 0;
  let b = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return {
    r: r / pixelCount,
    g: g / pixelCount,
    b: b / pixelCount,
  };
}

/**
 * Generate deterministic mock predictions based on actual image data.
 *
 * The hash determines the primary disease class, and the colour
 * profile influences confidence scores to make them feel realistic.
 *
 * @param {HTMLImageElement} img - Decoded image element.
 * @returns {Array<{ classIndex: number, confidence: number }>}
 */
function mockInference(img) {
  const hash = computeImageHash(img);
  const avgColor = computeAverageColor(img);

  // Determine "greenness" of the image.  A very green image may be healthy.
  const greenRatio = avgColor.g / (avgColor.r + avgColor.g + avgColor.b + 1);
  const isLikelyHealthy = greenRatio > 0.42;

  // Exclude the "Healthy Plant" class index (13) for diseased predictions
  const diseaseClassCount = NUM_CLASSES - 1;

  let primaryIndex;
  if (isLikelyHealthy && hash % 5 === 0) {
    // ~20% chance to flag healthy for very green images
    primaryIndex = NUM_CLASSES - 1; // Healthy Plant
  } else {
    primaryIndex = hash % diseaseClassCount;
  }

  // Primary confidence: 72% - 95% range
  const baseConfidence = 0.72 + ((hash % 23) / 100);
  const primaryConfidence = Math.min(baseConfidence, 0.95);

  // Secondary prediction
  const secondaryIndex = (primaryIndex + 1 + (hash % 3)) % diseaseClassCount;
  const secondaryConfidence = Math.max(
    primaryConfidence * (0.4 + ((hash % 20) / 100)),
    CONFIDENCE_THRESHOLD,
  );

  // Tertiary prediction
  const tertiaryIndex = (secondaryIndex + 1 + (hash % 4)) % diseaseClassCount;
  const tertiaryConfidence = Math.max(
    secondaryConfidence * (0.3 + ((hash % 15) / 100)),
    CONFIDENCE_THRESHOLD,
  );

  const predictions = [
    { classIndex: primaryIndex, confidence: primaryConfidence },
    { classIndex: secondaryIndex, confidence: secondaryConfidence },
    { classIndex: tertiaryIndex, confidence: tertiaryConfidence },
  ];

  // If primary is healthy, only return that
  if (primaryIndex === NUM_CLASSES - 1) {
    return [predictions[0]];
  }

  return predictions.filter((p) => p.confidence >= CONFIDENCE_THRESHOLD);
}

// ---------------------------------------------------------------------------
// Simulated delay for realistic UX during mock inference
// ---------------------------------------------------------------------------

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full analysis pipeline.
 *
 * @param {File} imageFile - The uploaded image File object.
 * @param {Object} [options]
 * @param {function} [options.onStageChange] - Callback invoked with (stageName, stageData).
 * @returns {Promise<{
 *   predictions: Array<Object>,
 *   usingMock: boolean,
 *   analysisTimeMs: number,
 * }>}
 */
export async function analyzeImage(imageFile, options = {}) {
  const { onStageChange } = options;
  const startTime = performance.now();

  function reportStage(stage, data = {}) {
    if (typeof onStageChange === "function") {
      onStageChange(stage, data);
    }
  }

  try {
    // Stage 1: Load model
    reportStage(ANALYSIS_STAGES.LOADING_MODEL, { progress: 0 });
    const { usingMock } = await loadModel((progress) => {
      reportStage(ANALYSIS_STAGES.LOADING_MODEL, { progress });
    });

    // Stage 2: Preprocess image
    reportStage(ANALYSIS_STAGES.PREPROCESSING);
    const { tensor, imageElement } = await preprocessImage(imageFile);

    // Simulate slight delay for UX when using mock
    if (usingMock) {
      await delay(600);
    }

    // Stage 3: Run inference
    reportStage(ANALYSIS_STAGES.RUNNING_INFERENCE);

    let rawPredictions;
    if (usingMock) {
      await delay(800);
      rawPredictions = mockInference(imageElement);
      tensor.dispose();
    } else {
      rawPredictions = await runModelInference(tensor);
      tensor.dispose();
    }

    // Stage 4: Post-process - map class indices to disease info
    reportStage(ANALYSIS_STAGES.POSTPROCESSING);

    if (usingMock) {
      await delay(400);
    }

    const predictions = rawPredictions.map((pred) => {
      const diseaseInfo = getDiseaseByClassIndex(pred.classIndex);
      if (!diseaseInfo) {
        return {
          classIndex: pred.classIndex,
          confidence: Math.round(pred.confidence * 1000) / 10,
          disease_name: "Unknown Disease",
          disease_name_hindi: "अज्ञात रोग",
          crop_type: "Unknown",
          symptoms: "Unable to identify. Please consult a local agricultural expert.",
          affected_stages: "N/A",
          treatment_chemical: "Consult your nearest Krishi Vigyan Kendra (KVK) for diagnosis.",
          treatment_organic: "Consult your nearest Krishi Vigyan Kendra (KVK) for diagnosis.",
          dosage: "N/A",
          cost_per_acre: 0,
          prevention_tips: "Regular field monitoring, maintain crop hygiene",
        };
      }

      return {
        ...diseaseInfo,
        confidence: Math.round(pred.confidence * 1000) / 10,
      };
    });

    const analysisTimeMs = Math.round(performance.now() - startTime);

    reportStage(ANALYSIS_STAGES.COMPLETE, { predictions, analysisTimeMs });

    return { predictions, usingMock, analysisTimeMs };
  } catch (err) {
    const analysisTimeMs = Math.round(performance.now() - startTime);
    reportStage(ANALYSIS_STAGES.ERROR, {
      error: err.message || "Analysis failed",
    });
    throw new AnalysisError(
      err.message || "Image analysis failed. Please try again.",
      analysisTimeMs,
    );
  }
}

/**
 * Custom error class for analysis failures.
 */
export class AnalysisError extends Error {
  /**
   * @param {string} message - Error description.
   * @param {number} analysisTimeMs - Elapsed time before failure.
   */
  constructor(message, analysisTimeMs = 0) {
    super(message);
    this.name = "AnalysisError";
    this.analysisTimeMs = analysisTimeMs;
  }
}

/**
 * Return the current model status.
 *
 * @returns {{ loaded: boolean, loading: boolean, error: string|null, usingMock: boolean }}
 */
export function getModelStatus() {
  return { ...modelStatus };
}

/**
 * Dispose the cached model and reset state.
 * Useful for testing or freeing GPU/WASM memory.
 */
export function resetModel() {
  if (cachedModel) {
    cachedModel.dispose();
    cachedModel = null;
  }
  modelLoadPromise = null;
  modelStatus = {
    loaded: false,
    loading: false,
    error: null,
    usingMock: false,
  };
}
