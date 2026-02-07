/**
 * APMCPricePage - Main page for APMC price comparison and recommendations.
 *
 * Orchestrates:
 *  - Commodity search and selection
 *  - State/district filters and sorting
 *  - Price table with best-price highlighting
 *  - Best APMC recommendation card
 *  - Smart price alerts
 *  - Data export and share (WhatsApp)
 *
 * Data flow:
 *  1. User selects a commodity via CommoditySearch
 *  2. Page fetches prices, best APMC, and trends from backend in parallel
 *  3. FilterPanel + sort are applied client-side to the fetched price list
 *  4. BestAPMCCard receives the best APMC from the /best endpoint (first recommendation)
 *  5. PriceAlerts derives insights from the price list
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import PropTypes from "prop-types";
import {
  BuildingStorefrontIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

import { LoadingSpinner, ErrorMessage, Card, Badge, Button } from "@components/common";
import {
  CommoditySearch,
  FilterPanel,
  PriceTable,
  BestAPMCCard,
  PriceAlerts,
  SellAdvisory,
} from "@components/apmc";
import {
  getCommodities,
  getPrices,
  getBestAPMC,
  getTrends,
} from "@services/apmcApi";
import useApp from "@hooks/useApp";
import useLocation from "@hooks/useLocation";
import storage from "@utils/storage";
import { formatPricePerQuintal, formatDate } from "@utils/helpers";

const CACHE_KEY_PREFIX = "farmhelp_apmc_";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const INITIAL_FILTERS = {
  state: "",
  district: "",
  sort: "price_desc",
};

function APMCPricePage() {
  const { language } = useApp();
  const { location } = useLocation();
  const routerLocation = useRouterLocation();

  // Data state
  const [commodities, setCommodities] = useState([]);
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [prices, setPrices] = useState([]);
  const [bestAPMC, setBestAPMC] = useState(null);
  const [trends, setTrends] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // UI state
  const [loading, setLoading] = useState(false);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);
  const voiceAutoSearchDone = useRef(false);

  // Fetch commodities on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchCommodities() {
      setCommoditiesLoading(true);
      try {
        const cached = storage.get(`${CACHE_KEY_PREFIX}commodities`, null);
        if (cached && cached._ts && Date.now() - cached._ts < CACHE_TTL_MS) {
          setCommodities(cached.commodities || []);
          setCommoditiesLoading(false);
          return;
        }

        const data = await getCommodities();
        if (!cancelled) {
          setCommodities(data.commodities || []);
          storage.set(`${CACHE_KEY_PREFIX}commodities`, {
            ...data,
            _ts: Date.now(),
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load commodities:", err);
        }
      } finally {
        if (!cancelled) setCommoditiesLoading(false);
      }
    }

    fetchCommodities();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch price data when commodity changes
  const fetchPriceData = useCallback(
    async (commodity, forceRefresh = false) => {
      if (!commodity) return;

      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        // Check cache
        const cacheKey = `${CACHE_KEY_PREFIX}prices_${commodity.toLowerCase()}`;
        if (!forceRefresh) {
          const cached = storage.get(cacheKey, null);
          if (cached && cached._ts && Date.now() - cached._ts < CACHE_TTL_MS) {
            if (currentRequestId !== requestIdRef.current) return;
            setPrices(cached.prices || []);
            setBestAPMC(cached.bestAPMC || null);
            setTrends(cached.trends || null);
            setLoading(false);
            return;
          }
        }

        // Build location params for best APMC
        const locationParams = {};
        if (location?.coordinates) {
          locationParams.latitude = location.coordinates.lat;
          locationParams.longitude = location.coordinates.lon;
        }

        // Parallel API calls
        const [pricesRes, bestRes, trendsRes] = await Promise.allSettled([
          getPrices({ commodity, limit: 100 }),
          getBestAPMC(commodity, locationParams),
          getTrends(commodity, { days: 7 }),
        ]);

        if (currentRequestId !== requestIdRef.current) return;

        const pricesData =
          pricesRes.status === "fulfilled" ? pricesRes.value.prices || [] : [];
        
        // Extract best APMC from recommendations array (first item is the best)
        let bestData = null;
        if (bestRes.status === "fulfilled" && bestRes.value) {
          const recommendations = bestRes.value.recommendations || [];
          if (recommendations.length > 0) {
            // Map backend field names to component expected names
            const rec = recommendations[0];
            bestData = {
              mandi_name: rec.mandi_name,
              state: rec.state,
              district: rec.district,
              price_per_quintal: rec.latest_price || rec.price_per_quintal,
              min_price: rec.min_price,
              max_price: rec.max_price,
              modal_price: rec.modal_price,
              net_price_per_quintal: rec.net_price_per_quintal,
              transport_cost_per_quintal: rec.transport_cost_per_quintal,
              distance_km: rec.distance_km,
              arrival_date: rec.arrival_date,
            };
          }
        }
        
        const trendsData =
          trendsRes.status === "fulfilled" ? trendsRes.value : null;

        setPrices(pricesData);
        setBestAPMC(bestData);
        setTrends(trendsData);

        // Cache
        storage.set(cacheKey, {
          prices: pricesData,
          bestAPMC: bestData,
          trends: trendsData,
          _ts: Date.now(),
        });
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        setError(err.message || "Failed to fetch APMC prices");
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [location],
  );

  const handleCommoditySelect = useCallback(
    (commodity) => {
      setSelectedCommodity(commodity);
      setFilters(INITIAL_FILTERS);
      fetchPriceData(commodity);
    },
    [fetchPriceData],
  );

  // Auto-search when navigated from voice assistant with a commodity
  useEffect(() => {
    const voiceCommodity = routerLocation.state?.commodity;
    if (voiceCommodity && !voiceAutoSearchDone.current) {
      voiceAutoSearchDone.current = true;
      setSelectedCommodity(voiceCommodity);
      setFilters(INITIAL_FILTERS);
      fetchPriceData(voiceCommodity);
    }
  }, [routerLocation.state, fetchPriceData]);

  const handleRefresh = useCallback(() => {
    if (selectedCommodity) {
      fetchPriceData(selectedCommodity, true);
    }
  }, [selectedCommodity, fetchPriceData]);

  // Client-side filtering and sorting
  const filteredPrices = useMemo(() => {
    let result = [...prices];

    if (filters.state) {
      result = result.filter((p) => p.state === filters.state);
    }
    if (filters.district) {
      result = result.filter((p) => p.district === filters.district);
    }

    switch (filters.sort) {
      case "price_asc":
        result.sort((a, b) => (a.price_per_quintal || 0) - (b.price_per_quintal || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price_per_quintal || 0) - (a.price_per_quintal || 0));
        break;
      case "name_asc":
        result.sort((a, b) => (a.mandi_name || "").localeCompare(b.mandi_name || "")); // mandi_name is the field from API
        break;
      case "date_desc":
        result.sort((a, b) => {
          const da = a.arrival_date ? new Date(a.arrival_date) : new Date(0);
          const db = b.arrival_date ? new Date(b.arrival_date) : new Date(0);
          return db - da;
        });
        break;
      default:
        break;
    }

    return result;
  }, [prices, filters]);

  // Price statistics for BestAPMCCard
  const priceStats = useMemo(() => {
    const allPrices = prices.map((p) => p.price_per_quintal).filter(Boolean);
    if (allPrices.length === 0) return { avg: 0, min: 0, max: 0 };
    return {
      avg: allPrices.reduce((a, b) => a + b, 0) / allPrices.length,
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
    };
  }, [prices]);

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (filteredPrices.length === 0) return;

    const headers = [
      "APMC",
      "State",
      "District",
      "Price/Quintal",
      "Min Price",
      "Max Price",
      "Modal Price",
      "Date",
    ];
    const rows = filteredPrices.map((p) => [
      p.mandi_name, // Field name from API
      p.state,
      p.district,
      p.price_per_quintal,
      p.min_price,
      p.max_price,
      p.modal_price,
      p.arrival_date || "",
    ]);

    const csv =
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `apmc_prices_${selectedCommodity}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredPrices, selectedCommodity]);

  // Share via WhatsApp
  const handleShareWhatsApp = useCallback(() => {
    if (!selectedCommodity || filteredPrices.length === 0) return;

    const best = filteredPrices[0];
    let text = `*${selectedCommodity} APMC Prices*\n\n`;
    text += `Best Price: ${formatPricePerQuintal(best.price_per_quintal)} at ${best.mandi_name}\n`;
    text += `Total APMCs: ${filteredPrices.length}\n\n`;

    const top3 = filteredPrices
      .slice(0, 3)
      .map((p) => `- ${p.mandi_name}: ${formatPricePerQuintal(p.price_per_quintal)}`)
      .join("\n");
    text += `Top APMCs:\n${top3}\n\n`;
    text += `_via FarmHelp App_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [selectedCommodity, filteredPrices]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BuildingStorefrontIcon className="h-6 w-6 text-secondary-600" />
            <h1 className="text-2xl font-display font-bold text-neutral-900">
              {language === "hi" ? "APMC भाव" : "APMC Price"}
            </h1>
          </div>
          <p className="text-sm text-neutral-600">
            {language === "hi"
              ? "अपनी फसल के लिए सबसे अच्छा APMC खोजें"
              : "Compare prices and find the best APMC for your crop"}
          </p>
        </div>

        {selectedCommodity && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              loading={loading}
              icon={<ArrowPathIcon className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredPrices.length === 0}
              icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              disabled={filteredPrices.length === 0}
              icon={<ShareIcon className="h-4 w-4" />}
            >
              Share
            </Button>
          </div>
        )}
      </div>

      {/* Commodity search */}
      <Card>
        <div className="p-4 sm:p-5">
          <CommoditySearch
            commodities={commodities}
            value={selectedCommodity}
            onSelect={handleCommoditySelect}
            loading={commoditiesLoading}
          />
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={handleRefresh}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner
            size="lg"
            message={`Fetching ${selectedCommodity} prices...`}
          />
        </div>
      )}

      {/* Main content */}
      {!loading && selectedCommodity && prices.length > 0 && (
        <>
          {/* Summary stats */}
          <SummaryStats prices={prices} commodity={selectedCommodity} />

          {/* Best APMC + alerts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <BestAPMCCard
              bestAPMC={bestAPMC}
              averagePrice={priceStats.avg}
              worstPrice={priceStats.min}
              className="lg:col-span-2"
            />
            <PriceAlerts
              prices={prices}
              commodity={selectedCommodity}
              className="lg:col-span-1"
            />
          </div>

          {/* Sell Advisory - Storage vs Immediate Sell Recommendation */}
          <SellAdvisory
            commodity={selectedCommodity}
            state={filters.state || null}
          />

          {/* Filters */}
          <FilterPanel
            prices={prices}
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Price trends summary */}
          {trends && <TrendsSummary trends={trends} commodity={selectedCommodity} />}

          {/* Price table */}
          <PriceTable
            prices={filteredPrices}
            bestAPMCName={bestAPMC?.mandi_name || ""}
          />
        </>
      )}

      {/* No results after search */}
      {!loading && selectedCommodity && prices.length === 0 && !error && (
        <Card variant="flat" className="border border-neutral-200">
          <div className="flex flex-col items-center gap-3 py-12">
            <BuildingStorefrontIcon className="h-10 w-10 text-neutral-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-700">
                No price data for {selectedCommodity}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Try a different commodity or check back later
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * SummaryStats - Horizontal stat cards for avg, min, max, and APMC count.
 */
function SummaryStats({ prices, commodity }) {
  const stats = useMemo(() => {
    const allPrices = prices.map((p) => p.price_per_quintal).filter(Boolean);
    if (allPrices.length === 0) return null;
    return {
      avg: allPrices.reduce((a, b) => a + b, 0) / allPrices.length,
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
      count: allPrices.length,
    };
  }, [prices]);

  if (!stats) return null;

  const items = [
    {
      label: "Average Price",
      value: formatPricePerQuintal(stats.avg),
      color: "text-neutral-900",
    },
    {
      label: "Highest Price",
      value: formatPricePerQuintal(stats.max),
      color: "text-primary-700",
    },
    {
      label: "Lowest Price",
      value: formatPricePerQuintal(stats.min),
      color: "text-danger-600",
    },
    {
      label: "Total APMCs",
      value: String(stats.count),
      color: "text-accent-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} variant="flat" className="border border-neutral-200">
          <div className="p-3.5 text-center">
            <p className="text-xs text-neutral-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold tabular-nums ${item.color}`}>
              {item.value}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

SummaryStats.propTypes = {
  prices: PropTypes.array.isRequired,
  commodity: PropTypes.string.isRequired,
};

/**
 * TrendsSummary - Compact price trend display from the /trends API.
 */
function TrendsSummary({ trends, commodity }) {
  if (!trends || !trends.statistics) return null;

  const { statistics, trend: trendDir, price_history } = trends;
  const trendLabel =
    trendDir === "up"
      ? "Rising"
      : trendDir === "down"
        ? "Falling"
        : "Stable";
  const trendColor =
    trendDir === "up"
      ? "text-primary-700 bg-primary-50 border-primary-200"
      : trendDir === "down"
        ? "text-danger-700 bg-danger-50 border-danger-200"
        : "text-neutral-700 bg-neutral-50 border-neutral-200";

  return (
    <Card variant="flat" className="border border-neutral-200">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ChartBarIcon className="h-5 w-5 text-neutral-600" />
          <h3 className="text-sm font-semibold text-neutral-700">
            Price Trend (7 days)
          </h3>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${trendColor}`}>
            {trendLabel}
          </span>
        </div>

        {/* Simple bar chart visualization */}
        {price_history && price_history.length > 0 && (
          <div className="flex items-end gap-1 h-16">
            {price_history.map((point, i) => {
              const maxVal = Math.max(
                ...price_history.map((p) => p.avg_price || p.price || 0),
              );
              const minVal = Math.min(
                ...price_history.map((p) => p.avg_price || p.price || 0),
              );
              const range = maxVal - minVal || 1;
              const val = point.avg_price || point.price || 0;
              const height = ((val - minVal) / range) * 100;

              return (
                <div
                  key={point.date || i}
                  className="flex-1 flex flex-col items-center justify-end"
                  title={`${point.date || ""}: Rs ${Math.round(val)}`}
                >
                  <div
                    className="w-full rounded-t bg-primary-400 hover:bg-primary-500 transition-colors min-h-[4px]"
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                  <span className="text-[9px] text-neutral-400 mt-1 truncate w-full text-center">
                    {point.date ? point.date.slice(5) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
          <span>
            Avg: {formatPricePerQuintal(statistics.mean || statistics.average || statistics.avg_price)}
          </span>
          {statistics.std_dev != null && (
            <span>Std Dev: Rs {Math.round(statistics.std_dev)}</span>
          )}
          {(statistics.count != null || statistics.data_points != null) && (
            <span>{statistics.count || statistics.data_points} data points</span>
          )}
        </div>
      </div>
    </Card>
  );
}

TrendsSummary.propTypes = {
  trends: PropTypes.object,
  commodity: PropTypes.string,
};

export default APMCPricePage;
