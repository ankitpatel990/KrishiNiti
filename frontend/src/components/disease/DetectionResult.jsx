/**
 * DetectionResult - Disease detection result display.
 *
 * Shows:
 *  - Disease name in English and Hindi
 *  - Confidence score with animated progress bar
 *  - Symptoms list with icons
 *  - Affected crop stages as badges
 *  - Crop type indicator
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  ExclamationCircleIcon,
  BeakerIcon,
  TagIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge } from "@components/common";
import { formatPercentage } from "@utils/helpers";

/**
 * Map a confidence value (0-100) to a severity descriptor and colour.
 *
 * @param {number} confidence - Percentage value (0-100).
 * @returns {{ label: string, color: string, barColor: string }}
 */
function getConfidenceIndicator(confidence) {
  if (confidence >= 80) {
    return {
      label: "High Confidence",
      color: "danger",
      barColor: "bg-danger-500",
    };
  }
  if (confidence >= 50) {
    return {
      label: "Moderate Confidence",
      color: "warning",
      barColor: "bg-secondary-500",
    };
  }
  return {
    label: "Low Confidence",
    color: "info",
    barColor: "bg-accent-500",
  };
}

function DetectionResult({ result, className = "" }) {
  if (!result) {
    return null;
  }

  const {
    disease_name,
    disease_name_hindi,
    crop_type,
    confidence,
    symptoms,
    affected_stages,
  } = result;

  const indicator = getConfidenceIndicator(confidence);
  const symptomList = symptoms
    ? symptoms.split(/\.\s*/).filter(Boolean)
    : [];
  const stageList = affected_stages
    ? affected_stages.split(/,\s*/).filter(Boolean)
    : [];

  return (
    <Card variant="bordered" className={`animate-fade-in ${className}`}>
      {/* Header: disease name + confidence */}
      <div className="space-y-4">
        {/* Disease identification */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon
                className="h-5 w-5 shrink-0 text-danger-500"
                aria-hidden="true"
              />
              <h3 className="text-lg font-semibold text-neutral-900">
                {disease_name}
              </h3>
            </div>
            {disease_name_hindi && (
              <p className="ml-7 text-sm text-neutral-500" lang="hi">
                {disease_name_hindi}
              </p>
            )}
          </div>

          {crop_type && (
            <Badge variant="primary" size="md" dot>
              {crop_type}
            </Badge>
          )}
        </div>

        {/* Confidence bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-neutral-600">
              <BeakerIcon className="h-4 w-4" aria-hidden="true" />
              Detection Confidence
            </span>
            <Badge variant={indicator.color} size="sm">
              {indicator.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-2.5 rounded-full bg-neutral-200 overflow-hidden"
              role="progressbar"
              aria-valuenow={confidence}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Confidence: ${formatPercentage(confidence)}`}
            >
              <motion.div
                className={`h-full rounded-full ${indicator.barColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="text-sm font-semibold text-neutral-800 tabular-nums w-12 text-right">
              {formatPercentage(confidence)}
            </span>
          </div>
        </div>

        {/* Symptoms */}
        {symptomList.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
              <TagIcon className="h-4 w-4" aria-hidden="true" />
              Symptoms
            </h4>
            <ul className="space-y-1.5 ml-6">
              {symptomList.map((symptom, index) => (
                <li
                  key={index}
                  className="relative text-sm text-neutral-600 pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-danger-400"
                >
                  {symptom.trim()}
                  {!symptom.endsWith(".") ? "." : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Affected stages */}
        {stageList.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
              <ClockIcon className="h-4 w-4" aria-hidden="true" />
              Affected Crop Stages
            </h4>
            <div className="flex flex-wrap gap-2">
              {stageList.map((stage) => (
                <Badge key={stage} variant="secondary" size="sm">
                  {stage}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

DetectionResult.propTypes = {
  result: PropTypes.shape({
    disease_name: PropTypes.string.isRequired,
    disease_name_hindi: PropTypes.string,
    crop_type: PropTypes.string,
    confidence: PropTypes.number.isRequired,
    symptoms: PropTypes.string,
    affected_stages: PropTypes.string,
  }),
  className: PropTypes.string,
};

export default DetectionResult;
