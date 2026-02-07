/**
 * DiseaseDetectionPage - AI-powered crop disease detection.
 *
 * Workflow:
 *  1. User selects a crop from the AI-supported crop list
 *  2. User uploads one or more crop leaf images
 *  3. "Analyze" sends the image + crop_type to the backend
 *  4. Backend runs the appropriate HuggingFace model (ViT or MobileNetV2)
 *  5. Results with disease info and treatment are displayed
 *
 * Detection chain:
 *   Backend AI model  ->  fallback mock data (last resort)
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  CropSelector,
  ImageUpload,
  DetectionResult,
  TreatmentCard,
  AIAnalysis,
} from "@components/disease";
import { Button, Card, ErrorMessage } from "@components/common";
import useApp from "@hooks/useApp";
import { ANALYSIS_STAGES } from "@utils/aiModel";
import { detectDiseaseWithImage } from "@services/diseaseApi";

// ---------------------------------------------------------------------------
// Fallback mock data (used only when backend AI fails)
// ---------------------------------------------------------------------------

const FALLBACK_MOCK_RESULTS = [
  {
    disease_name: "Paddy Blast",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u092C\u094D\u0932\u093E\u0938\u094D\u091F",
    crop_type: "Paddy",
    confidence: 87.5,
    symptoms:
      "Spindle-shaped lesions on leaves with brown centers and gray margins.",
    affected_stages: "Tillering, Flowering, Panicle Initiation",
    treatment_chemical:
      "Tricyclazole 75% WP @ 0.6g/l or Isoprothiolane 40% EC @ 1.5ml/l",
    treatment_organic:
      "Neem oil spray (5ml/l), proper drainage, avoid excess nitrogen",
    dosage: "0.6g per liter of water, spray 2-3 times at 10-15 day intervals",
    cost_per_acre: 500,
    prevention_tips:
      "Use resistant varieties, maintain proper spacing, avoid excess nitrogen fertilizer",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function DiseaseDetectionPage() {
  const { language } = useApp();

  // Step tracking
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [images, setImages] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // AI analysis tracking
  const [analysisStage, setAnalysisStage] = useState(ANALYSIS_STAGES.IDLE);
  const [usingMock, setUsingMock] = useState(false);
  const [analysisTimeMs, setAnalysisTimeMs] = useState(null);
  const [modelUsed, setModelUsed] = useState(null);

  const detectionIdRef = useRef(0);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handleCropSelect = useCallback(
    (cropValue) => {
      setSelectedCrop(cropValue);
      // Reset results when crop changes
      if (results) {
        setResults(null);
        setError(null);
        setAnalysisStage(ANALYSIS_STAGES.IDLE);
        setUsingMock(false);
        setAnalysisTimeMs(null);
        setModelUsed(null);
      }
    },
    [results],
  );

  const handleImagesChange = useCallback((newImages) => {
    setImages(newImages);
    setResults(null);
    setError(null);
    setAnalysisStage(ANALYSIS_STAGES.IDLE);
    setUsingMock(false);
    setAnalysisTimeMs(null);
    setModelUsed(null);
  }, []);

  const handleDetect = useCallback(async () => {
    if (images.length === 0 || !selectedCrop) return;

    const currentId = ++detectionIdRef.current;

    setDetecting(true);
    setResults(null);
    setError(null);
    setUsingMock(false);
    setAnalysisTimeMs(null);
    setModelUsed(null);

    // Show progress stages
    setAnalysisStage(ANALYSIS_STAGES.LOADING_MODEL);

    try {
      // Simulate stage progression for UX
      setTimeout(() => {
        if (detectionIdRef.current === currentId) {
          setAnalysisStage(ANALYSIS_STAGES.PREPROCESSING);
        }
      }, 500);

      setTimeout(() => {
        if (detectionIdRef.current === currentId) {
          setAnalysisStage(ANALYSIS_STAGES.RUNNING_INFERENCE);
        }
      }, 1200);

      const startTime = performance.now();
      const imageFile = images[0].file;

      const response = await detectDiseaseWithImage(imageFile, selectedCrop);

      if (detectionIdRef.current !== currentId) return;

      const elapsed = Math.round(performance.now() - startTime);
      setAnalysisTimeMs(elapsed);

      if (response?.predictions && response.predictions.length > 0) {
        const mapped = response.predictions.map((pred) => ({
          disease_name: pred.disease_name,
          disease_name_hindi: pred.disease_name_hindi || "",
          crop_type: pred.crop_type || selectedCrop,
          confidence: pred.confidence,
          symptoms: pred.symptoms || "",
          affected_stages: pred.affected_stages || "",
          treatment_chemical: pred.treatment_chemical || "",
          treatment_organic: pred.treatment_organic || "",
          dosage: pred.dosage || "",
          cost_per_acre: pred.cost_per_acre || 0,
          prevention_tips: pred.prevention_tips || "",
        }));

        setResults(mapped);
        setModelUsed(response.predictions[0]?.model_used || "ai");
        setUsingMock(false);
      } else {
        setResults(FALLBACK_MOCK_RESULTS);
        setUsingMock(true);
      }

      setAnalysisStage(ANALYSIS_STAGES.COMPLETE);
      setDetecting(false);
    } catch (err) {
      if (detectionIdRef.current !== currentId) return;

      // Last resort: use inline mock
      setResults(FALLBACK_MOCK_RESULTS);
      setUsingMock(true);
      setAnalysisStage(ANALYSIS_STAGES.COMPLETE);
      setError(
        err?.message ||
          "AI model unavailable. Showing sample results for demonstration.",
      );
      setDetecting(false);
    }
  }, [images, selectedCrop]);

  const handleReset = useCallback(() => {
    detectionIdRef.current++;
    for (const img of images) {
      URL.revokeObjectURL(img.preview);
    }
    setSelectedCrop(null);
    setImages([]);
    setResults(null);
    setError(null);
    setDetecting(false);
    setAnalysisStage(ANALYSIS_STAGES.IDLE);
    setUsingMock(false);
    setAnalysisTimeMs(null);
    setModelUsed(null);
  }, [images]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------

  const hasCrop = Boolean(selectedCrop);
  const hasImages = images.length > 0;
  const canAnalyze = hasCrop && hasImages && !detecting;
  const hasResults = results && results.length > 0;
  const primaryResult = hasResults ? results[0] : null;
  const showAnalysisPanel = analysisStage !== ANALYSIS_STAGES.IDLE;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-display font-bold text-neutral-900 sm:text-3xl">
          {language === "hi"
            ? "\u0930\u094B\u0917 \u092A\u0939\u091A\u093E\u0928"
            : "Disease Detection"}
        </h1>
        <p className="text-neutral-600 max-w-2xl">
          {language === "hi"
            ? "\u0905\u092A\u0928\u0940 \u092B\u0938\u0932 \u091A\u0941\u0928\u0947\u0902, \u0924\u0938\u094D\u0935\u0940\u0930 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 AI \u0938\u0947 \u0930\u094B\u0917 \u0915\u093E \u092A\u0924\u093E \u0932\u0917\u093E\u090F\u0902\u0964"
            : "Select your crop, upload a leaf photo, and let AI identify diseases with treatment recommendations."}
        </p>
      </div>

      {/* How it works */}
      <Card variant="flat" className="border border-primary-200 bg-primary-50/50">
        <div className="flex items-start gap-3">
          <InformationCircleIcon
            className="h-5 w-5 shrink-0 text-primary-600 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-sm text-primary-800 space-y-1">
            <p className="font-medium">
              {language === "hi" ? "\u0915\u0948\u0938\u0947 \u0915\u093E\u092E \u0915\u0930\u0924\u093E \u0939\u0948" : "How it works"}
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-primary-700">
              <li>
                {language === "hi"
                  ? "\u0905\u092A\u0928\u0940 \u092B\u0938\u0932 \u091A\u0941\u0928\u0947\u0902"
                  : "Select the crop you want to analyze"}
              </li>
              <li>
                {language === "hi"
                  ? "\u092A\u094D\u0930\u092D\u093E\u0935\u093F\u0924 \u092A\u0924\u094D\u0924\u0940 \u0915\u0940 \u0938\u094D\u092A\u0937\u094D\u091F \u0924\u0938\u094D\u0935\u0940\u0930 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902"
                  : "Upload a clear photo of the affected leaf"}
              </li>
              <li>
                {language === "hi"
                  ? "AI \u0938\u0947 \u0930\u094B\u0917 \u0915\u0940 \u092A\u0939\u091A\u093E\u0928 \u0914\u0930 \u0909\u092A\u091A\u093E\u0930 \u092A\u093E\u090F\u0902"
                  : "Get AI-powered disease diagnosis and treatment plan"}
              </li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Step 1: Crop selection */}
      {!hasResults && (
        <section aria-label="Crop selection">
          <CropSelector
            selectedCrop={selectedCrop}
            onCropSelect={handleCropSelect}
            disabled={detecting}
          />
        </section>
      )}

      {/* Step 2: Image upload (shown after crop is selected) */}
      {hasCrop && !hasResults && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Image upload"
        >
          <ImageUpload
            images={images}
            onImagesChange={handleImagesChange}
            disabled={detecting}
          />
        </motion.section>
      )}

      {/* Analyze button */}
      {canAnalyze && !hasResults && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleDetect}
            icon={
              <MagnifyingGlassCircleIcon className="h-5 w-5" aria-hidden="true" />
            }
          >
            {language === "hi"
              ? "\u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0947\u0902"
              : "Analyze with AI"}
          </Button>
          <Button variant="ghost" size="lg" onClick={handleReset}>
            {language === "hi"
              ? "\u0930\u0940\u0938\u0947\u091F \u0915\u0930\u0947\u0902"
              : "Reset"}
          </Button>
        </div>
      )}

      {/* AI Analysis progress panel */}
      <AnimatePresence>
        {showAnalysisPanel && (
          <AIAnalysis
            stage={analysisStage}
            stageData={{}}
            usingMock={usingMock}
            analysisTimeMs={analysisTimeMs}
            modelUsed={modelUsed}
          />
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && !detecting && (
        <ErrorMessage
          message={error}
          title="Detection Notice"
          onRetry={handleDetect}
          onDismiss={handleDismissError}
        />
      )}

      {/* Results section */}
      <AnimatePresence>
        {hasResults && !detecting && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Section header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-neutral-900">
                {language === "hi"
                  ? "\u092A\u0930\u093F\u0923\u093E\u092E"
                  : "Detection Results"}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                icon={
                  <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                }
              >
                {language === "hi"
                  ? "\u0928\u0908 \u0924\u0938\u094D\u0935\u0940\u0930"
                  : "New Scan"}
              </Button>
            </div>

            {/* Primary detection result */}
            {primaryResult && (
              <>
                <DetectionResult result={primaryResult} />
                <TreatmentCard treatment={primaryResult} />
              </>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DiseaseDetectionPage;
