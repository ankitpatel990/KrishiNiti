/**
 * PriceTable - Responsive mandi price table with sorting and highlights.
 *
 * Features:
 *  - Desktop: Full table with sortable columns
 *  - Mobile: Card-based layout
 *  - Best price row highlighted
 *  - Price range bar (min/max)
 *  - Formatted dates and prices
 *  - Empty state
 */

import { useMemo } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  MapPinIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge } from "@components/common";
import { formatPricePerQuintal, formatDate } from "@utils/helpers";

/**
 * Determine a price trend indicator based on modal vs min/max spread.
 */
function getTrendIndicator(price) {
  if (!price.modal_price || !price.min_price || !price.max_price) {
    return { icon: MinusIcon, color: "text-neutral-400", label: "Stable" };
  }
  const mid = (price.min_price + price.max_price) / 2;
  const diff = ((price.modal_price - mid) / mid) * 100;

  if (diff > 2) {
    return { icon: ArrowTrendingUpIcon, color: "text-primary-600", label: "Rising" };
  }
  if (diff < -2) {
    return { icon: ArrowTrendingDownIcon, color: "text-danger-600", label: "Falling" };
  }
  return { icon: MinusIcon, color: "text-neutral-400", label: "Stable" };
}

function PriceTable({ prices = [], bestMandiName = "", className = "" }) {
  // Find the best price row
  const bestPrice = useMemo(() => {
    if (prices.length === 0) return null;
    return prices.reduce((best, p) =>
      (p.price_per_quintal || 0) > (best.price_per_quintal || 0) ? p : best,
    );
  }, [prices]);

  // Price range for bar visualization
  const priceRange = useMemo(() => {
    if (prices.length === 0) return { min: 0, max: 1 };
    const allPrices = prices.map((p) => p.price_per_quintal).filter(Boolean);
    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
    };
  }, [prices]);

  if (prices.length === 0) {
    return (
      <Card variant="flat" className={`border border-neutral-200 ${className}`}>
        <div className="flex flex-col items-center gap-2 py-8">
          <MapPinIcon className="h-8 w-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">
            No price data available. Select a commodity to see prices.
          </p>
        </div>
      </Card>
    );
  }

  const range = priceRange.max - priceRange.min || 1;

  return (
    <div className={className}>
      {/* Result count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-neutral-600">
          Showing <span className="font-semibold text-neutral-800">{prices.length}</span> mandis
        </p>
        {bestPrice && (
          <Badge variant="primary" size="sm" dot>
            Best: {formatPricePerQuintal(bestPrice.price_per_quintal)}
          </Badge>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-200">
              <th className="text-left py-3 px-3 font-semibold text-neutral-700">Mandi</th>
              <th className="text-left py-3 px-3 font-semibold text-neutral-700">Location</th>
              <th className="text-right py-3 px-3 font-semibold text-neutral-700">Price/qtl</th>
              <th className="text-center py-3 px-3 font-semibold text-neutral-700">Range</th>
              <th className="text-center py-3 px-3 font-semibold text-neutral-700">Trend</th>
              <th className="text-right py-3 px-3 font-semibold text-neutral-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price, index) => {
              const isBest =
                bestMandiName
                  ? price.mandi_name === bestMandiName
                  : price === bestPrice;
              const trend = getTrendIndicator(price);
              const TrendIcon = trend.icon;
              const barWidth =
                ((price.price_per_quintal - priceRange.min) / range) * 100;

              return (
                <motion.tr
                  key={price.id || `${price.mandi_name}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={[
                    "border-b border-neutral-100 transition-colors",
                    isBest
                      ? "bg-primary-50 hover:bg-primary-100"
                      : "hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {/* Mandi name */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {isBest && (
                        <StarIcon
                          className="h-4 w-4 text-secondary-500 shrink-0"
                          aria-label="Best price"
                        />
                      )}
                      <span className={isBest ? "font-semibold text-primary-800" : "text-neutral-800"}>
                        {price.mandi_name}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3 text-neutral-600">
                    {[price.district, price.state].filter(Boolean).join(", ")}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-3 text-right">
                    <span className={`font-semibold tabular-nums ${isBest ? "text-primary-700" : "text-neutral-900"}`}>
                      {formatPricePerQuintal(price.price_per_quintal)}
                    </span>
                  </td>

                  {/* Range bar */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 tabular-nums w-12 text-right">
                        {price.min_price ? `${Math.round(price.min_price)}` : "--"}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden min-w-[60px]">
                        <div
                          className={`h-full rounded-full ${isBest ? "bg-primary-500" : "bg-secondary-400"}`}
                          style={{ width: `${Math.max(barWidth, 5)}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-400 tabular-nums w-12">
                        {price.max_price ? `${Math.round(price.max_price)}` : "--"}
                      </span>
                    </div>
                  </td>

                  {/* Trend */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon className={`h-4 w-4 ${trend.color}`} aria-hidden="true" />
                      <span className={`text-xs ${trend.color}`}>{trend.label}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 text-right text-neutral-500 text-xs tabular-nums">
                    {formatDate(price.arrival_date)}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {prices.map((price, index) => {
          const isBest =
            bestMandiName
              ? price.mandi_name === bestMandiName
              : price === bestPrice;
          const trend = getTrendIndicator(price);
          const TrendIcon = trend.icon;

          return (
            <motion.div
              key={price.id || `${price.mandi_name}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={[
                "rounded-lg border p-3.5",
                isBest
                  ? "border-primary-300 bg-primary-50"
                  : "border-neutral-200 bg-white",
              ].join(" ")}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isBest && (
                      <StarIcon className="h-4 w-4 text-secondary-500" aria-label="Best price" />
                    )}
                    <h4 className={`text-sm font-semibold ${isBest ? "text-primary-800" : "text-neutral-800"}`}>
                      {price.mandi_name}
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {[price.district, price.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                {isBest && (
                  <Badge variant="primary" size="sm">Best Price</Badge>
                )}
              </div>

              {/* Price row */}
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold tabular-nums ${isBest ? "text-primary-700" : "text-neutral-900"}`}>
                  {formatPricePerQuintal(price.price_per_quintal)}
                </span>
                <div className="flex items-center gap-1">
                  <TrendIcon className={`h-4 w-4 ${trend.color}`} aria-hidden="true" />
                  <span className={`text-xs ${trend.color}`}>{trend.label}</span>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                <span>
                  Range: {price.min_price ? `Rs ${Math.round(price.min_price)}` : "--"} - {price.max_price ? `Rs ${Math.round(price.max_price)}` : "--"}
                </span>
                <span>{formatDate(price.arrival_date)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

PriceTable.propTypes = {
  prices: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      mandi_name: PropTypes.string,
      state: PropTypes.string,
      district: PropTypes.string,
      commodity: PropTypes.string,
      price_per_quintal: PropTypes.number,
      min_price: PropTypes.number,
      max_price: PropTypes.number,
      modal_price: PropTypes.number,
      arrival_date: PropTypes.string,
    }),
  ),
  bestMandiName: PropTypes.string,
  className: PropTypes.string,
};

export default PriceTable;
