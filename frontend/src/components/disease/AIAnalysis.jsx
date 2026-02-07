/**
 * AIAnalysis - Real-time analysis progress and confidence visualization.
 *
 * Displays:
 *  - Multi-step progress indicator (model loading, preprocessing, inference)
 *  - Animated progress bar per stage
 *  - Model status badge (real model vs mock/demo)
 *  - Analysis time after completion
 *
 * This component is purely presentational. The analysis orchestration
 * lives in the parent page component.
 */

import { useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  CpuChipIcon,
  PhotoIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CubeTransparentIcon,
} from "@heroicons/react/24/outline";
import { ANALYSIS_STAGES } from "@utils/aiModel";
import { Badge, Card } from "@components/common";

// ---------------------------------------------------------------------------
// Stage configuration
// ---------------------------------------------------------------------------

const STAGE_CONFIG = [
  {
    key: ANALYSIS_STAGES.LOADING_MODEL,
    label: "Loading AI Model",
    labelHi: "AI \u092E\u0949\u0921\u0932 \u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948",
    icon: CpuChipIcon,
    description: "Preparing the disease detection model",
  },
  {
    key: ANALYSIS_STAGES.PREPROCESSING,
    label: "Processing Image",
    labelHi: "\u0924\u0938\u094D\u0935\u0940\u0930 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0939\u094B \u0930\u0939\u0940 \u0939\u0948",
    icon: PhotoIcon,
    description: "Resizing and normalizing for analysis",
  },
  {
    key: ANALYSIS_STAGES.RUNNING_INFERENCE,
    label: "Analyzing Disease",
    labelHi: "\u0930\u094B\u0917 \u0915\u093E \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923",
    icon: SparklesIcon,
    description: "Running AI detection on the image",
  },
  {
    key: ANALYSIS_STAGES.POSTPROCESSING,
    label: "Preparing Results",
    labelHi: "\u092A\u0930\u093F\u0923\u093E\u092E \u0924\u0948\u092F\u093E\u0930 \u0939\u094B \u0930\u0939\u0947 \u0939\u0948\u0902",
    icon: CubeTransparentIcon,
    description: "Matching with treatment database",
  },
];

/**
 * Map the current analysis stage to a numeric step index (0-based).
 */
function stageToStepIndex(stage) {
  const idx = STAGE_CONFIG.findIndex((s) => s.key === stage);
  if (stage === ANALYSIS_STAGES.COMPLETE) return STAGE_CONFIG.length;
  if (stage === ANALYSIS_STAGES.ERROR) return -1;
  return idx >= 0 ? idx : -1;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StageStep({ config, status, index }) {
  const isActive = status === "active";
  const isComplete = status === "complete";
  const isPending = status === "pending";

  const Icon = config.icon;

  return (
    <div
      className={[
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all duration-300",
        isActive ? "bg-primary-50 ring-1 ring-primary-200" : "",
        isComplete ? "opacity-70" : "",
        isPending ? "opacity-40" : "",
      ].join(" ")}
    >
      {/* Step indicator */}
      <div className="relative flex shrink-0 items-center justify-center">
        {isComplete ? (
          <CheckCircleIcon
            className="h-6 w-6 text-primary-600"
            aria-hidden="true"
          />
        ) : (
          <div
            className={[
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              isActive
                ? "bg-primary-600 text-white"
                : "bg-neutral-200 text-neutral-500",
            ].join(" ")}
          >
            {index + 1}
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon
            className={[
              "h-4 w-4 shrink-0",
              isActive ? "text-primary-600" : "text-neutral-400",
            ].join(" ")}
            aria-hidden="true"
          />
          <p
            className={[
              "text-sm font-medium",
              isActive ? "text-primary-800" : "text-neutral-600",
            ].join(" ")}
          >
            {config.label}
          </p>

          {isActive && (
            <motion.div
              className="flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          )}
        </div>

        {isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-0.5 text-xs text-neutral-500"
          >
            {config.description}
          </motion.p>
        )}
      </div>
    </div>
  );
}

StageStep.propTypes = {
  config: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  status: PropTypes.oneOf(["pending", "active", "complete"]).isRequired,
  index: PropTypes.number.isRequired,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function AIAnalysis({
  stage = ANALYSIS_STAGES.IDLE,
  stageData = {},
  usingMock = false,
  analysisTimeMs = null,
  className = "",
}) {
  const currentStepIndex = useMemo(() => stageToStepIndex(stage), [stage]);

  const isAnalyzing =
    stage !== ANALYSIS_STAGES.IDLE &&
    stage !== ANALYSIS_STAGES.COMPLETE &&
    stage !== ANALYSIS_STAGES.ERROR;

  const isComplete = stage === ANALYSIS_STAGES.COMPLETE;
  const isError = stage === ANALYSIS_STAGES.ERROR;

  // Don't render when idle
  if (stage === ANALYSIS_STAGES.IDLE) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <Card variant="bordered" className="overflow-visible">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CpuChipIcon
                  className="h-5 w-5 text-primary-600"
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-neutral-900">
                  AI Analysis
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {usingMock && (
                  <Badge variant="warning" size="sm">
                    Demo Mode
                  </Badge>
                )}
                {!usingMock && isComplete && (
                  <Badge variant="primary" size="sm">
                    AI Model
                  </Badge>
                )}
                {isComplete && analysisTimeMs != null && (
                  <span className="flex items-center gap-1 text-xs text-neutral-500">
                    <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {(analysisTimeMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>

            {/* Overall progress bar (during analysis) */}
            {isAnalyzing && (
              <div className="space-y-1">
                <div
                  className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(
                    ((currentStepIndex + 1) / STAGE_CONFIG.length) * 100,
                  )}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Analysis progress"
                >
                  <motion.div
                    className="h-full rounded-full bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${((currentStepIndex + 0.5) / STAGE_CONFIG.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Complete state progress bar */}
            {isComplete && (
              <div className="h-1.5 w-full rounded-full bg-primary-200 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary-500"
                  initial={{ width: "75%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}

            {/* Stage steps */}
            <div className="space-y-1">
              {STAGE_CONFIG.map((config, index) => {
                let status = "pending";
                if (isComplete || isError) {
                  status = "complete";
                } else if (index < currentStepIndex) {
                  status = "complete";
                } else if (index === currentStepIndex) {
                  status = "active";
                }

                return (
                  <StageStep
                    key={config.key}
                    config={config}
                    status={status}
                    index={index}
                  />
                );
              })}
            </div>

            {/* Completion message */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-200 px-3 py-2"
              >
                <CheckCircleIcon
                  className="h-5 w-5 text-primary-600 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm text-primary-800">
                  Analysis complete. Results are shown below.
                </p>
              </motion.div>
            )}

            {/* Error message */}
            {isError && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-danger-50 border border-danger-200 px-3 py-2"
              >
                <ExclamationTriangleIcon
                  className="h-5 w-5 text-danger-600 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm text-danger-800">
                  {stageData?.error || "Analysis failed. Please try again."}
                </p>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

AIAnalysis.propTypes = {
  stage: PropTypes.oneOf(Object.values(ANALYSIS_STAGES)),
  stageData: PropTypes.object,
  usingMock: PropTypes.bool,
  analysisTimeMs: PropTypes.number,
  className: PropTypes.string,
};

export default AIAnalysis;
