/**
 * DiseaseDetectionPage - Main page for crop disease detection.
 *
 * Orchestrates the disease detection workflow:
 *  1. User uploads one or more crop images
 *  2. "Analyze" is clicked to start detection
 *  3. AI model processes the image (TF.js -> backend API -> mock fallback)
 *  4. Real-time progress is shown via the AIAnalysis component
 *  5. Results and treatment recommendations are displayed
 *
 * Fallback chain:
 *   TensorFlow.js client-side model (or deterministic mock)
 *    -> Backend /api/v1/disease/detect endpoint
 *    -> Inline mock data (last resort)
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  ImageUpload,
  DetectionResult,
  TreatmentCard,
  AIAnalysis,
} from "@components/disease";
import { Button, Card, ErrorMessage } from "@components/common";
import useApp from "@hooks/useApp";
import { analyzeImage, ANALYSIS_STAGES } from "@utils/aiModel";
import { detectDisease as detectDiseaseApi } from "@services/diseaseApi";

// ---------------------------------------------------------------------------
// Fallback mock data (used only when both AI and backend fail)
// ---------------------------------------------------------------------------

const FALLBACK_MOCK_RESULTS = [
  {
    disease_name: "Paddy Blast",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u092C\u094D\u0932\u093E\u0938\u094D\u091F",
    crop_type: "Paddy",
    confidence: 87.5,
    symptoms:
      "Spindle-shaped lesions on leaves with brown centers and gray margins. Lesions appear on leaf blades, leaf sheaths, nodes, and panicles. Severe infection causes leaf drying and panicle blast.",
    affected_stages: "Tillering, Flowering, Panicle Initiation",
    treatment_chemical:
      "Tricyclazole 75% WP @ 0.6g/l or Isoprothiolane 40% EC @ 1.5ml/l or Carbendazim 50% WP @ 0.5g/l",
    treatment_organic:
      "Neem oil spray (5ml/l), proper drainage, avoid excess nitrogen, use resistant varieties like IR64, Swarna",
    dosage:
      "0.6g per liter of water, spray 2-3 times at 10-15 day intervals",
    cost_per_acre: 500,
    prevention_tips:
      "Use resistant varieties, maintain proper spacing, avoid excess nitrogen fertilizer, ensure good drainage, remove infected plant debris",
  },
  {
    disease_name: "Brown Spot of Paddy",
    disease_name_hindi: "\u0927\u093E\u0928 \u0915\u093E \u092D\u0942\u0930\u093E \u0927\u092C\u094D\u092C\u093E",
    crop_type: "Paddy",
    confidence: 62.3,
    symptoms:
      "Small, circular to oval brown spots on leaves with yellow halos. Spots coalesce to form large patches. Affects grain quality and yield.",
    affected_stages: "Seedling, Tillering, Flowering",
    treatment_chemical:
      "Mancozeb 75% WP @ 2g/l or Propiconazole 25% EC @ 0.5ml/l",
    treatment_organic:
      "Neem seed kernel extract (5%), cow urine spray, proper field sanitation",
    dosage:
      "2g per liter of water, apply at boot stage and heading stage",
    cost_per_acre: 450,
    prevention_tips:
      "Use certified seeds, maintain proper plant spacing, avoid water stress, remove infected debris",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function DiseaseDetectionPage() {
  const { language } = useApp();

  const [images, setImages] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // AI analysis tracking
  const [analysisStage, setAnalysisStage] = useState(ANALYSIS_STAGES.IDLE);
  const [analysisStageData, setAnalysisStageData] = useState({});
  const [usingMock, setUsingMock] = useState(false);
  const [analysisTimeMs, setAnalysisTimeMs] = useState(null);

  // Ref to track whether a detection run has been superseded
  const detectionIdRef = useRef(0);

  // -------------------------------------------------------------------
  // Stage change handler (passed into analyzeImage)
  // -------------------------------------------------------------------

  const handleStageChange = useCallback((stage, data = {}) => {
    setAnalysisStage(stage);
    setAnalysisStageData(data);
  }, []);

  // -------------------------------------------------------------------
  // Backend fallback detection
  // -------------------------------------------------------------------

  async function backendFallbackDetect(cropType) {
    try {
      const response = await detectDiseaseApi(cropType || "Paddy");
      if (response?.predictions && response.predictions.length > 0) {
        return response.predictions.map((pred) => ({
          disease_name: pred.disease_name,
          disease_name_hindi: pred.disease_name_hindi || "",
          crop_type: cropType || "Paddy",
          confidence: Math.round((pred.confidence || 0.5) * 100 * 10) / 10,
          symptoms: "",
          affected_stages: "",
          treatment_chemical: pred.treatment_summary?.chemical || "",
          treatment_organic: pred.treatment_summary?.organic || "",
          dosage: "",
          cost_per_acre: 0,
          prevention_tips: "",
        }));
      }
    } catch {
      // Backend also failed; will use inline mock
    }
    return null;
  }

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handleImagesChange = useCallback((newImages) => {
    setImages(newImages);
    setResults(null);
    setError(null);
    setAnalysisStage(ANALYSIS_STAGES.IDLE);
    setAnalysisStageData({});
    setUsingMock(false);
    setAnalysisTimeMs(null);
  }, []);

  const handleDetect = useCallback(async () => {
    if (images.length === 0) return;

    const currentId = ++detectionIdRef.current;

    setDetecting(true);
    setResults(null);
    setError(null);
    setAnalysisStage(ANALYSIS_STAGES.IDLE);
    setUsingMock(false);
    setAnalysisTimeMs(null);

    try {
      // Run AI analysis on the first uploaded image
      const imageFile = images[0].file;
      const aiResult = await analyzeImage(imageFile, {
        onStageChange: (stage, data) => {
          // Ignore if this detection run has been superseded
          if (detectionIdRef.current !== currentId) return;
          handleStageChange(stage, data);
        },
      });

      // Ignore if superseded
      if (detectionIdRef.current !== currentId) return;

      setUsingMock(aiResult.usingMock);
      setAnalysisTimeMs(aiResult.analysisTimeMs);

      if (aiResult.predictions && aiResult.predictions.length > 0) {
        setResults(aiResult.predictions);
        setDetecting(false);
        return;
      }

      // AI returned empty predictions - try backend
      const backendResults = await backendFallbackDetect("Paddy");
      if (detectionIdRef.current !== currentId) return;

      if (backendResults) {
        setResults(backendResults);
        setUsingMock(true);
      } else {
        setResults(FALLBACK_MOCK_RESULTS);
        setUsingMock(true);
      }

      setDetecting(false);
    } catch (err) {
      if (detectionIdRef.current !== currentId) return;

      // AI failed - try backend fallback
      try {
        const backendResults = await backendFallbackDetect("Paddy");
        if (detectionIdRef.current !== currentId) return;

        if (backendResults) {
          setResults(backendResults);
          setUsingMock(true);
          setAnalysisStage(ANALYSIS_STAGES.COMPLETE);
          setDetecting(false);
          return;
        }
      } catch {
        // Backend also failed
      }

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
  }, [images, handleStageChange]);

  const handleReset = useCallback(() => {
    detectionIdRef.current++;
    for (const img of images) {
      URL.revokeObjectURL(img.preview);
    }
    setImages([]);
    setResults(null);
    setError(null);
    setDetecting(false);
    setAnalysisStage(ANALYSIS_STAGES.IDLE);
    setAnalysisStageData({});
    setUsingMock(false);
    setAnalysisTimeMs(null);
  }, [images]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------

  const hasImages = images.length > 0;
  const hasResults = results && results.length > 0;
  const primaryResult = hasResults ? results[0] : null;
  const showAnalysisPanel =
    analysisStage !== ANALYSIS_STAGES.IDLE;

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
            ? "\u0905\u092A\u0928\u0940 \u092B\u0938\u0932 \u0915\u0940 \u0924\u0938\u094D\u0935\u0940\u0930 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902 \u0914\u0930 AI \u0938\u0947 \u0930\u094B\u0917 \u0915\u093E \u092A\u0924\u093E \u0932\u0917\u093E\u090F\u0902\u0964 \u0909\u092A\u091A\u093E\u0930 \u0914\u0930 \u0930\u094B\u0915\u0925\u093E\u092E \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u092A\u093E\u090F\u0902\u0964"
            : "Upload a photo of your crop and let AI identify diseases. Get detailed treatment recommendations and prevention tips."}
        </p>
      </div>

      {/* Feature info card */}
      <Card variant="flat" className="border border-primary-200 bg-primary-50/50">
        <div className="flex items-start gap-3">
          <InformationCircleIcon
            className="h-5 w-5 shrink-0 text-primary-600 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-sm text-primary-800 space-y-1">
            <p className="font-medium">How it works</p>
            <ol className="list-decimal list-inside space-y-0.5 text-primary-700">
              <li>Upload a clear photo of the affected leaf or plant</li>
              <li>Click &quot;Analyze&quot; to start AI-powered detection</li>
              <li>
                View the identified disease, confidence score, and treatment
                plan
              </li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Image upload section */}
      <section aria-label="Image upload">
        <ImageUpload
          images={images}
          onImagesChange={handleImagesChange}
          disabled={detecting}
        />
      </section>

      {/* Action buttons */}
      {hasImages && !detecting && !hasResults && (
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
              : "Analyze"}
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
            stageData={analysisStageData}
            usingMock={usingMock}
            analysisTimeMs={analysisTimeMs}
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

            {/* Additional predictions */}
            {results.length > 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-neutral-600">
                  Other Possible Diseases
                </h3>
                <div className="space-y-4">
                  {results.slice(1).map((r, index) => (
                    <DetectionResult key={index} result={r} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DiseaseDetectionPage;
