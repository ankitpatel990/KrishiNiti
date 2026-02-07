/**
 * FarmingAdvice - Comprehensive crop-specific farming recommendations.
 *
 * Sections:
 *  - Crop suitability indicator with enriched profile
 *  - AI-powered / rule-based recommendations
 *  - Historical weather comparison
 *  - Soil moisture data (NASA POWER)
 *  - Government crop/soil advisory
 *  - Growth stages reference
 */

import { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudIcon,
  BeakerIcon,
  ScissorsIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ChartBarIcon,
  GlobeAltIcon,
  BugAntIcon,
  SparklesIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
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
    key: "pest_disease",
    label: "Pest & Disease",
    icon: BugAntIcon,
    iconColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
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
    key: "growth_stage_advice",
    label: "Growth Stage",
    icon: ChartBarIcon,
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    key: "weather_impact",
    label: "Weather Impact",
    icon: GlobeAltIcon,
    iconColor: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HistoricalComparison({ data }) {
  if (!data) return null;

  const { temperature, rainfall, interpretation, years_compared } = data;

  return (
    <Card variant="default">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-neutral-900">
            Historical Comparison
          </h4>
          <Badge variant="secondary" size="sm">
            {years_compared}-year avg
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {temperature && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <p className="text-xs font-medium text-indigo-700 mb-1.5">Temperature</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Historical Avg Max</span>
                  <span className="font-medium">{temperature.hist_avg_max}C</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Current Avg Max</span>
                  <span className="font-medium">{temperature.current_avg_max}C</span>
                </div>
                {temperature.deviation_max != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Deviation</span>
                    <span className={`flex items-center gap-1 font-medium ${temperature.deviation_max > 0 ? "text-red-600" : "text-blue-600"}`}>
                      {temperature.deviation_max > 0 ? (
                        <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                      )}
                      {temperature.deviation_max > 0 ? "+" : ""}
                      {temperature.deviation_max}C
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {rainfall && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs font-medium text-blue-700 mb-1.5">Rainfall</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Historical Avg</span>
                  <span className="font-medium">{rainfall.hist_avg_mm}mm</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Current Forecast</span>
                  <span className="font-medium">{rainfall.current_mm}mm</span>
                </div>
                {rainfall.deviation_pct != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Deviation</span>
                    <span className={`flex items-center gap-1 font-medium ${rainfall.deviation_pct > 0 ? "text-blue-600" : "text-amber-600"}`}>
                      {rainfall.deviation_pct > 0 ? (
                        <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                      )}
                      {rainfall.deviation_pct > 0 ? "+" : ""}
                      {rainfall.deviation_pct}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {interpretation && (
          <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
            {interpretation}
          </p>
        )}
      </div>
    </Card>
  );
}

HistoricalComparison.propTypes = {
  data: PropTypes.object,
};


function SoilMoistureCard({ data }) {
  if (!data) return null;

  const {
    root_zone_moisture,
    profile_moisture,
    evapotranspiration_mm_day,
    interpretation,
    data_period,
    source,
  } = data;

  const moisturePct = root_zone_moisture != null
    ? Math.round(root_zone_moisture * 100)
    : null;

  const getMoistureColor = (value) => {
    if (value == null) return "bg-neutral-300";
    if (value < 0.15) return "bg-red-500";
    if (value < 0.3) return "bg-amber-500";
    if (value < 0.5) return "bg-yellow-400";
    if (value < 0.7) return "bg-emerald-400";
    if (value < 0.85) return "bg-blue-400";
    return "bg-blue-600";
  };

  return (
    <Card variant="default">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <GlobeAltIcon className="h-5 w-5 text-teal-600" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-neutral-900">
            Soil Moisture
          </h4>
          <Badge variant="secondary" size="sm">
            NASA POWER
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {root_zone_moisture != null && (
            <div className="text-center p-3 rounded-lg border border-teal-100 bg-teal-50/50">
              <p className="text-xs text-teal-700 font-medium mb-1">Root Zone</p>
              <div className="relative w-full h-2 bg-neutral-200 rounded-full mb-1.5">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${getMoistureColor(root_zone_moisture)}`}
                  style={{ width: `${moisturePct}%` }}
                />
              </div>
              <p className="text-lg font-bold text-neutral-900">{moisturePct}%</p>
            </div>
          )}

          {profile_moisture != null && (
            <div className="text-center p-3 rounded-lg border border-teal-100 bg-teal-50/50">
              <p className="text-xs text-teal-700 font-medium mb-1">Profile</p>
              <p className="text-lg font-bold text-neutral-900">
                {Math.round(profile_moisture * 100)}%
              </p>
            </div>
          )}

          {evapotranspiration_mm_day != null && (
            <div className="text-center p-3 rounded-lg border border-teal-100 bg-teal-50/50">
              <p className="text-xs text-teal-700 font-medium mb-1">Evapotranspiration</p>
              <p className="text-lg font-bold text-neutral-900">
                {evapotranspiration_mm_day}
                <span className="text-xs font-normal ml-0.5">mm/day</span>
              </p>
            </div>
          )}
        </div>

        {interpretation && (
          <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
            {interpretation}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-neutral-400">
          {data_period && (
            <span>
              Data: {data_period.start} to {data_period.end}
            </span>
          )}
          {source && <span>{source}</span>}
        </div>
      </div>
    </Card>
  );
}

SoilMoistureCard.propTypes = {
  data: PropTypes.object,
};


function GovtAdvisoryCard({ data }) {
  if (!data || !data.advisories || data.advisories.length === 0) return null;

  return (
    <Card variant="default">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-neutral-900">
            Government Advisory
          </h4>
          <Badge variant="warning" size="sm">
            {data.district}
          </Badge>
        </div>

        <div className="space-y-2">
          {data.advisories.map((advisory, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-amber-100 bg-amber-50/50 p-3"
            >
              {Object.entries(advisory).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm mb-1 last:mb-0">
                  <span className="text-neutral-500 capitalize min-w-[80px]">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="text-neutral-700">{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="text-xs text-neutral-400">Source: {data.source}</p>
      </div>
    </Card>
  );
}

GovtAdvisoryCard.propTypes = {
  data: PropTypes.object,
};


function GrowthStagesAccordion({ stages, cropType }) {
  const [expanded, setExpanded] = useState(false);

  if (!stages || Object.keys(stages).length === 0) return null;

  return (
    <Card variant="default">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-neutral-900">
            {cropType} Growth Stages
          </h4>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {Object.entries(stages).map(([name, info]) => (
                <div
                  key={name}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-sm font-medium text-emerald-800 capitalize">
                      {name.replace(/_/g, " ")}
                    </h5>
                    <span className="text-xs text-neutral-500">
                      {info.duration_days} days | {info.temp_range} | {info.water_per_week}/week
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600">{info.key_activity}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

GrowthStagesAccordion.propTypes = {
  stages: PropTypes.object,
  cropType: PropTypes.string,
};


// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function FarmingAdvice({
  recommendations,
  cropType,
  cropSuitability,
  cropProfile,
  historicalComparison,
  soilData,
  govtAdvisory,
  aiPowered,
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
      className={`space-y-4 ${className}`}
    >
      {/* Primary recommendations card */}
      <Card variant="default">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-neutral-900">
                Farming Advice
                {cropType && (
                  <span className="text-neutral-500 font-normal ml-1.5">
                    for {cropType}
                  </span>
                )}
              </h3>
              {aiPowered && (
                <Badge variant="primary" size="sm" dot>
                  <span className="flex items-center gap-1">
                    <SparklesIcon className="h-3 w-3" />
                    AI Powered
                  </span>
                </Badge>
              )}
            </div>

            {cropSuitability && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Crop Suitability:</span>
                <Badge variant={suitabilityInfo.variant} size="md" dot>
                  {suitabilityInfo.label}
                </Badge>
              </div>
            )}
          </div>

          {/* Suitability description with enriched profile */}
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
                      <span>Optimal temp: {cropProfile.optimal_temp_range}</span>
                    )}
                    {cropProfile.water_need && (
                      <span>Water need: {cropProfile.water_need.replace("_", " ")}</span>
                    )}
                    {cropProfile.growth_season && (
                      <span>Season: {cropProfile.growth_season}</span>
                    )}
                  </div>
                )}
                {/* Gujarat varieties */}
                {cropProfile?.gujarat_varieties?.length > 0 && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    <span className="font-medium">Gujarat varieties:</span>{" "}
                    {cropProfile.gujarat_varieties.join(", ")}
                  </p>
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

      {/* Historical comparison */}
      <HistoricalComparison data={historicalComparison} />

      {/* Soil moisture */}
      <SoilMoistureCard data={soilData} />

      {/* Government advisory */}
      <GovtAdvisoryCard data={govtAdvisory} />

      {/* Growth stages reference */}
      {cropProfile?.growth_stages && (
        <GrowthStagesAccordion
          stages={cropProfile.growth_stages}
          cropType={cropType}
        />
      )}
    </motion.div>
  );
}

FarmingAdvice.propTypes = {
  recommendations: PropTypes.object,
  cropType: PropTypes.string,
  cropSuitability: PropTypes.oneOf(["excellent", "good", "moderate", "poor"]),
  cropProfile: PropTypes.shape({
    optimal_temp_range: PropTypes.string,
    water_need: PropTypes.string,
    growth_season: PropTypes.string,
    gujarat_varieties: PropTypes.arrayOf(PropTypes.string),
    soil_types_suitable: PropTypes.arrayOf(PropTypes.string),
    sowing_months: PropTypes.arrayOf(PropTypes.string),
    harvest_months: PropTypes.arrayOf(PropTypes.string),
    common_pests: PropTypes.arrayOf(PropTypes.string),
    common_diseases: PropTypes.arrayOf(PropTypes.string),
    growth_stages: PropTypes.object,
  }),
  historicalComparison: PropTypes.object,
  soilData: PropTypes.object,
  govtAdvisory: PropTypes.object,
  aiPowered: PropTypes.bool,
  className: PropTypes.string,
};

export default FarmingAdvice;
