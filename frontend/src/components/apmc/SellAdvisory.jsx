/**
 * SellAdvisory - Storage vs Immediate Sell Recommendation Card.
 *
 * Features:
 *  - Clear recommendation (Sell Now / Store / Wait)
 *  - Best time to sell window with calendar indicator
 *  - Decision factors with impact indicators
 *  - Price position visualization
 *  - Storage cost information
 */

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  BanknotesIcon,
  ArchiveBoxIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge, LoadingSpinner } from "@components/common";
import { formatPricePerQuintal } from "@utils/helpers";
import { getSellAdvisory } from "@services/apmcApi";

const RECOMMENDATION_CONFIG = {
  SELL_NOW: {
    icon: BanknotesIcon,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    badgeVariant: "success",
    label: "Sell Now",
  },
  SELL_SOON: {
    icon: BanknotesIcon,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    badgeVariant: "success",
    label: "Sell Soon",
  },
  STORE: {
    icon: ArchiveBoxIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    badgeVariant: "info",
    label: "Store",
  },
  WAIT: {
    icon: ClockIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    badgeVariant: "warning",
    label: "Wait",
  },
  FLEXIBLE: {
    icon: ChartBarIcon,
    color: "text-neutral-600",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-300",
    badgeVariant: "neutral",
    label: "Flexible",
  },
};

const IMPACT_ICONS = {
  positive: { icon: CheckCircleIcon, color: "text-green-500" },
  negative: { icon: ExclamationTriangleIcon, color: "text-amber-500" },
  neutral: { icon: InformationCircleIcon, color: "text-blue-500" },
};

function SellAdvisory({ commodity, state, className = "" }) {
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFactors, setShowFactors] = useState(false);

  useEffect(() => {
    if (!commodity) {
      setAdvisory(null);
      return;
    }

    let cancelled = false;

    async function fetchAdvisory() {
      setLoading(true);
      setError(null);

      try {
        const data = await getSellAdvisory(commodity, { state });
        if (!cancelled) {
          setAdvisory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load sell advisory");
          console.error("Sell advisory error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAdvisory();

    return () => {
      cancelled = true;
    };
  }, [commodity, state]);

  if (!commodity) return null;

  if (loading) {
    return (
      <Card className={`${className} p-6`}>
        <div className="flex items-center justify-center gap-3">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-neutral-500">Analyzing market conditions...</span>
        </div>
      </Card>
    );
  }

  if (error || !advisory?.has_data) {
    return (
      <Card className={`${className} p-6`}>
        <div className="flex items-center gap-3 text-neutral-500">
          <InformationCircleIcon className="h-5 w-5" />
          <span className="text-sm">
            {error || "Insufficient data for sell recommendation"}
          </span>
        </div>
      </Card>
    );
  }

  const { recommendation, best_time_to_sell, factors = [], trend } = advisory;
  const config = RECOMMENDATION_CONFIG[recommendation?.action] || RECOMMENDATION_CONFIG.FLEXIBLE;
  const RecommendationIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={`overflow-hidden border-2 ${config.borderColor} ${config.bgColor}`}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
                <RecommendationIcon className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-800">
                  Sell Advisory
                </h3>
                <p className="text-xs text-neutral-500">{commodity}</p>
              </div>
            </div>
            <Badge variant={config.badgeVariant} size="lg">
              {recommendation?.text || config.label}
            </Badge>
          </div>

          {/* Main Recommendation */}
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-2xl font-bold ${config.color}`}>
                {recommendation?.text}
              </span>
              <span className="text-sm text-neutral-500">
                ({recommendation?.confidence}% confidence)
              </span>
            </div>
            <p className="text-sm text-neutral-600">{recommendation?.reasoning}</p>
          </div>

          {/* Price Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-neutral-500 mb-1">Current Price</p>
              <p className="text-lg font-semibold text-neutral-800">
                {advisory.current_price ? formatPricePerQuintal(advisory.current_price) : "N/A"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-neutral-500 mb-1">30-Day Avg</p>
              <p className="text-lg font-semibold text-neutral-800">
                {formatPricePerQuintal(advisory.historical_avg)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-neutral-500 mb-1">Price Trend</p>
              <div className="flex items-center justify-center gap-1">
                {trend === "up" && <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />}
                {trend === "down" && <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />}
                {trend === "stable" && <MinusIcon className="h-5 w-5 text-neutral-400" />}
                <span className={`text-sm font-medium ${
                  trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-neutral-600"
                }`}>
                  {advisory.trend_change_pct > 0 ? "+" : ""}{advisory.trend_change_pct}%
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-xs text-neutral-500 mb-1">Price Position</p>
              <p className="text-lg font-semibold text-neutral-800">
                {advisory.price_position_percentile?.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Best Time to Sell */}
          {best_time_to_sell && (
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                <h4 className="font-medium text-neutral-800">Best Time to Sell</h4>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[150px]">
                  <p className="text-xl font-bold text-primary-700">
                    {best_time_to_sell.window}
                  </p>
                  {best_time_to_sell.months_to_wait > 0 && (
                    <p className="text-sm text-neutral-500">
                      Wait {best_time_to_sell.months_to_wait} month(s)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {best_time_to_sell.expected_price_rise_pct && (
                    <p className="text-sm text-green-600 font-medium">
                      +{best_time_to_sell.expected_price_rise_pct}% expected rise
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    {best_time_to_sell.confidence}% confidence
                  </p>
                </div>
              </div>
              <p className="text-sm text-neutral-600 mt-2 border-t border-neutral-100 pt-2">
                {best_time_to_sell.reason}
              </p>
            </div>
          )}

          {/* Storage Info */}
          {advisory.storage_class !== "perishable" && advisory.storage_cost_per_month > 0 && (
            <div className="bg-neutral-50 rounded-lg p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArchiveBoxIcon className="h-5 w-5 text-neutral-500" />
                <span className="text-sm text-neutral-600">
                  Storage Cost: <span className="font-medium">Rs {advisory.storage_cost_per_month}/qtl/month</span>
                </span>
              </div>
              <Badge variant="neutral" size="sm">
                {advisory.storage_class === "semi_perishable" ? "Semi-Perishable" : "Storable"}
              </Badge>
            </div>
          )}

          {/* Decision Factors (Collapsible) */}
          {factors.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowFactors(!showFactors)}
                className="flex items-center justify-between w-full text-sm font-medium text-neutral-700 hover:text-neutral-900 py-2"
              >
                <span>Decision Factors ({factors.length})</span>
                {showFactors ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>

              <AnimatePresence>
                {showFactors && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-2">
                      {factors.map((factor, idx) => {
                        const impactConfig = IMPACT_ICONS[factor.impact] || IMPACT_ICONS.neutral;
                        const ImpactIcon = impactConfig.icon;

                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm"
                          >
                            <ImpactIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${impactConfig.color}`} />
                            <div>
                              <p className="text-sm font-medium text-neutral-800">
                                {factor.factor}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {factor.detail}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

SellAdvisory.propTypes = {
  commodity: PropTypes.string,
  state: PropTypes.string,
  className: PropTypes.string,
};

export default SellAdvisory;
