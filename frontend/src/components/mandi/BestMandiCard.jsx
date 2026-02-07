/**
 * BestMandiCard - Featured card for the best mandi recommendation.
 *
 * Features:
 *  - Highlighted best mandi name, location, and price
 *  - Price comparison to average and worst
 *  - Potential profit calculation (per quintal extra)
 *  - Distance and Google Maps directions link
 *  - Contact / market details
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  TrophyIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge } from "@components/common";
import { formatPricePerQuintal, formatPrice } from "@utils/helpers";

function BestMandiCard({ bestMandi, averagePrice, worstPrice, className = "" }) {
  if (!bestMandi) return null;

  const priceDiffFromAvg =
    averagePrice && bestMandi.price_per_quintal
      ? bestMandi.price_per_quintal - averagePrice
      : null;
  const priceDiffFromWorst =
    worstPrice && bestMandi.price_per_quintal
      ? bestMandi.price_per_quintal - worstPrice
      : null;

  const profitPerQuintal = priceDiffFromAvg && priceDiffFromAvg > 0
    ? priceDiffFromAvg
    : 0;

  const netPrice = bestMandi.net_price_per_quintal ?? bestMandi.price_per_quintal;
  const transportCost = bestMandi.transport_cost_per_quintal ?? null;
  const distanceKm = bestMandi.distance_km ?? null;

  // Build Google Maps direction link
  const mapsUrl =
    bestMandi.latitude && bestMandi.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${bestMandi.latitude},${bestMandi.longitude}`
      : bestMandi.mandi_name
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bestMandi.mandi_name)}`
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="relative overflow-hidden border-2 border-primary-300 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        {/* Trophy ribbon */}
        <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
          BEST PRICE
        </div>

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600 shrink-0">
              <TrophyIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-primary-800 truncate">
                {bestMandi.mandi_name}
              </h3>
              <p className="text-sm text-neutral-600 flex items-center gap-1 mt-0.5">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                {[bestMandi.district, bestMandi.state]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>

          {/* Price section */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Main price */}
            <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-sm">
              <p className="text-xs text-neutral-500 mb-0.5">Selling Price</p>
              <p className="text-xl font-bold text-primary-700 tabular-nums">
                {formatPricePerQuintal(bestMandi.price_per_quintal)}
              </p>
            </div>

            {/* Net price (after transport) */}
            <div className="bg-white rounded-lg p-3 border border-neutral-200 shadow-sm">
              <p className="text-xs text-neutral-500 mb-0.5">
                {transportCost != null ? "Net Price" : "Modal Price"}
              </p>
              <p className="text-xl font-bold text-neutral-800 tabular-nums">
                {formatPricePerQuintal(netPrice || bestMandi.modal_price)}
              </p>
            </div>
          </div>

          {/* Comparison metrics */}
          <div className="space-y-2 mb-4">
            {profitPerQuintal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 flex items-center gap-1.5">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-primary-500" />
                  Extra over average
                </span>
                <span className="font-semibold text-primary-700">
                  +{formatPrice(profitPerQuintal, 0)}/qtl
                </span>
              </div>
            )}

            {priceDiffFromWorst != null && priceDiffFromWorst > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 flex items-center gap-1.5">
                  <CurrencyRupeeIcon className="h-4 w-4 text-secondary-500" />
                  Extra over lowest
                </span>
                <span className="font-semibold text-secondary-700">
                  +{formatPrice(priceDiffFromWorst, 0)}/qtl
                </span>
              </div>
            )}

            {distanceKm != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 flex items-center gap-1.5">
                  <TruckIcon className="h-4 w-4 text-neutral-500" />
                  Distance
                </span>
                <span className="font-medium text-neutral-700">
                  {distanceKm.toFixed(1)} km
                  {transportCost != null && (
                    <span className="text-neutral-400 ml-1">
                      (transport: {formatPrice(transportCost, 0)}/qtl)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Profit estimate for 10 quintals */}
          {profitPerQuintal > 0 && (
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-secondary-700 font-medium mb-1">
                Potential Extra Earnings (10 quintals)
              </p>
              <p className="text-lg font-bold text-secondary-800 tabular-nums">
                {formatPrice(profitPerQuintal * 10, 0)}
              </p>
              <p className="text-xs text-secondary-600 mt-0.5">
                Compared to average market price
              </p>
            </div>
          )}

          {/* Directions link */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <MapPinIcon className="h-4 w-4" />
              Get Directions
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

BestMandiCard.propTypes = {
  bestMandi: PropTypes.shape({
    mandi_name: PropTypes.string,
    state: PropTypes.string,
    district: PropTypes.string,
    price_per_quintal: PropTypes.number,
    modal_price: PropTypes.number,
    net_price_per_quintal: PropTypes.number,
    transport_cost_per_quintal: PropTypes.number,
    distance_km: PropTypes.number,
    latitude: PropTypes.number,
    longitude: PropTypes.number,
  }),
  averagePrice: PropTypes.number,
  worstPrice: PropTypes.number,
  className: PropTypes.string,
};

export default BestMandiCard;
