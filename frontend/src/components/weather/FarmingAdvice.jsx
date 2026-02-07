/**
 * FarmingAdvice - Crop-specific farming recommendations.
 *
 * Sections:
 *  - Irrigation recommendations
 *  - Spraying recommendations
 *  - Harvesting advice
 *  - General crop-specific advice
 *  - Crop suitability indicator
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  CloudIcon,
  BeakerIcon,
  ScissorsIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge } from "@components/common";

// ---------------------------------------------------------------------------
// Suitability configuration
// ---------------------------------------------------------------------------

const SUITABILITY_CONFIG = {
  excellent: {
    label: "Excellent",
    variant: "success",
    description: "Weather conditions are ideal for this crop.",
  },
  good: {
    label: "Good",
    variant: "primary",
    description: "Weather conditions are generally favorable.",
  },
  moderate: {
    label: "Moderate",
    variant: "warning",
    description: "Some weather conditions may affect crop growth.",
  },
  poor: {
    label: "Poor",
    variant: "danger",
    description: "Weather conditions are unfavorable. Take precautions.",
  },
};

// ---------------------------------------------------------------------------
// Advice sections
// ---------------------------------------------------------------------------

const ADVICE_SECTIONS = [
  {
    key: "irrigation",
    label: "Irrigation",
    icon: CloudIcon,
    iconColor: "text-accent-600",
    bgColor: "bg-accent-50",
    borderColor: "border-accent-200",
  },
  {
    key: "spraying",
    label: "Spraying",
    icon: BeakerIcon,
    iconColor: "text-primary-600",
    bgColor: "bg-primary-50",
    borderColor: "border-primary-200",
  },
  {
    key: "harvesting",
    label: "Harvesting",
    icon: ScissorsIcon,
    iconColor: "text-secondary-600",
    bgColor: "bg-secondary-50",
    borderColor: "border-secondary-200",
  },
  {
    key: "general",
    label: "General Advice",
    icon: LightBulbIcon,
    iconColor: "text-neutral-600",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-200",
  },
];

function FarmingAdvice({
  recommendations,
  cropType,
  cropSuitability,
  cropProfile,
  className = "",
}) {
  if (!recommendations) {
    return null;
  }

  const suitabilityInfo =
    SUITABILITY_CONFIG[cropSuitability] || SUITABILITY_CONFIG.moderate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={className}
    >
      <Card variant="default">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-neutral-900">
              Farming Advice
              {cropType && (
                <span className="text-neutral-500 font-normal ml-1.5">
                  for {cropType}
                </span>
              )}
            </h3>

            {cropSuitability && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Crop Suitability:</span>
                <Badge variant={suitabilityInfo.variant} size="md" dot>
                  {suitabilityInfo.label}
                </Badge>
              </div>
            )}
          </div>

          {/* Suitability description */}
          {cropSuitability && (
            <div className="flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2.5">
              <CheckCircleIcon
                className="h-5 w-5 shrink-0 text-neutral-500 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm text-neutral-700">
                  {suitabilityInfo.description}
                </p>
                {cropProfile && (
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-500">
                    {cropProfile.optimal_temp_range && (
                      <span>
                        Optimal temp: {cropProfile.optimal_temp_range}
                      </span>
                    )}
                    {cropProfile.water_need && (
                      <span>
                        Water need:{" "}
                        {cropProfile.water_need.replace("_", " ")}
                      </span>
                    )}
                    {cropProfile.growth_season && (
                      <span>Season: {cropProfile.growth_season}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advice sections */}
          <div className="grid gap-3 sm:grid-cols-2">
            {ADVICE_SECTIONS.map((section) => {
              const content = recommendations[section.key];
              if (!content) return null;

              const SectionIcon = section.icon;

              return (
                <div
                  key={section.key}
                  className={[
                    "rounded-lg border p-3.5",
                    section.borderColor,
                    section.bgColor,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <SectionIcon
                      className={`h-4 w-4 ${section.iconColor}`}
                      aria-hidden="true"
                    />
                    <h4 className="text-sm font-semibold text-neutral-800">
                      {section.label}
                    </h4>
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

FarmingAdvice.propTypes = {
  recommendations: PropTypes.shape({
    irrigation: PropTypes.string,
    spraying: PropTypes.string,
    harvesting: PropTypes.string,
    general: PropTypes.string,
  }),
  cropType: PropTypes.string,
  cropSuitability: PropTypes.oneOf(["excellent", "good", "moderate", "poor"]),
  cropProfile: PropTypes.shape({
    optimal_temp_range: PropTypes.string,
    water_need: PropTypes.string,
    growth_season: PropTypes.string,
  }),
  className: PropTypes.string,
};

export default FarmingAdvice;
