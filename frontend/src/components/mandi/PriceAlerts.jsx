/**
 * PriceAlerts - Smart price-based alerts for selling decisions.
 *
 * Features:
 *  - Good selling opportunity detection (best vs average spread)
 *  - Price drop warnings
 *  - High demand indicators
 *  - Dismissible alerts
 */

import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellAlertIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge } from "@components/common";
import { formatPricePerQuintal } from "@utils/helpers";

const SEVERITY_CONFIG = {
  opportunity: {
    borderColor: "border-primary-300",
    bgColor: "bg-primary-50",
    iconBg: "bg-primary-100 text-primary-600",
    textColor: "text-primary-800",
    Icon: ArrowTrendingUpIcon,
    badge: "primary",
  },
  warning: {
    borderColor: "border-secondary-300",
    bgColor: "bg-secondary-50",
    iconBg: "bg-secondary-100 text-secondary-600",
    textColor: "text-secondary-800",
    Icon: ExclamationTriangleIcon,
    badge: "secondary",
  },
  info: {
    borderColor: "border-accent-300",
    bgColor: "bg-accent-50",
    iconBg: "bg-accent-100 text-accent-600",
    textColor: "text-accent-800",
    Icon: BellAlertIcon,
    badge: "accent",
  },
};

/**
 * Derive smart alerts from price data.
 */
function deriveAlerts(prices, commodity) {
  if (!prices || prices.length === 0) return [];

  const alerts = [];
  const allPrices = prices.map((p) => p.price_per_quintal).filter(Boolean);
  if (allPrices.length === 0) return alerts;

  const maxPrice = Math.max(...allPrices);
  const minPrice = Math.min(...allPrices);
  const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
  const spread = maxPrice - minPrice;
  const spreadPct = avgPrice > 0 ? (spread / avgPrice) * 100 : 0;

  // Best mandi
  const bestMandi = prices.find((p) => p.price_per_quintal === maxPrice);

  // Opportunity: High spread means selling at the right mandi matters
  if (spreadPct > 5 && bestMandi) {
    alerts.push({
      id: "high-spread",
      severity: "opportunity",
      title: "Good Selling Opportunity",
      message: `${bestMandi.mandi_name} offers ${formatPricePerQuintal(maxPrice)} for ${commodity} - ${formatPricePerQuintal(spread)} more than the lowest mandi.`,
      actionable: true,
    });
  }

  // Warning: Wide price range suggests market volatility
  if (spreadPct > 15) {
    alerts.push({
      id: "high-volatility",
      severity: "warning",
      title: "Price Volatility Detected",
      message: `${commodity} prices vary by ${spreadPct.toFixed(1)}% across mandis. Compare carefully before selling.`,
      actionable: false,
    });
  }

  // Info: Multiple mandis above average
  const aboveAvgCount = allPrices.filter((p) => p > avgPrice).length;
  if (aboveAvgCount >= 3) {
    alerts.push({
      id: "multiple-high",
      severity: "info",
      title: "Multiple High-Price Mandis",
      message: `${aboveAvgCount} out of ${allPrices.length} mandis are offering above-average prices (>${formatPricePerQuintal(avgPrice)}).`,
      actionable: false,
    });
  }

  // Info: If all prices are very close, it's a stable market
  if (spreadPct <= 3 && allPrices.length >= 3) {
    alerts.push({
      id: "stable-market",
      severity: "info",
      title: "Stable Market Prices",
      message: `${commodity} prices are consistent across mandis (within ${spreadPct.toFixed(1)}% range). Safe to sell at the nearest mandi.`,
      actionable: false,
    });
  }

  return alerts;
}

function PriceAlerts({ prices, commodity, className = "" }) {
  const [dismissed, setDismissed] = useState(new Set());

  const alerts = useMemo(
    () => deriveAlerts(prices, commodity),
    [prices, commodity],
  );

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  if (visibleAlerts.length === 0 && alerts.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <BellAlertIcon className="h-5 w-5 text-neutral-600" />
        <h3 className="text-sm font-semibold text-neutral-700">
          Price Alerts
        </h3>
        {visibleAlerts.length > 0 && (
          <Badge variant="primary" size="sm">
            {visibleAlerts.length}
          </Badge>
        )}
      </div>

      {/* All dismissed */}
      {visibleAlerts.length === 0 && alerts.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-sm text-neutral-500">
          <ShieldCheckIcon className="h-4 w-4" />
          All alerts reviewed
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleAlerts.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const AlertIcon = config.Icon;

            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`rounded-lg border p-3 ${config.borderColor} ${config.bgColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${config.iconBg}`}>
                    <AlertIcon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className={`text-sm font-semibold ${config.textColor}`}>
                        {alert.title}
                      </h4>
                      {alert.actionable && (
                        <Badge variant="primary" size="sm">
                          Action
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDismissed((prev) => new Set([...prev, alert.id]))
                    }
                    className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-white transition-colors shrink-0"
                    aria-label="Dismiss alert"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

PriceAlerts.propTypes = {
  prices: PropTypes.array,
  commodity: PropTypes.string,
  className: PropTypes.string,
};

export default PriceAlerts;
