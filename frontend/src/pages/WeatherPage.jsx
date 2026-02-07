/**
 * WeatherPage - Comprehensive weather dashboard.
 *
 * Orchestrates:
 *  1. Pincode entry / geolocation detection via LocationInput
 *  2. Fetch 7-day forecast from backend (with localStorage caching)
 *  3. Fetch farming alerts + crop-specific analysis
 *  4. Display CurrentWeather, WeeklyForecast, WeatherAlerts, FarmingAdvice
 *  5. Refresh and crop-type switching
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import {
  ArrowPathIcon,
  CloudIcon,
} from "@heroicons/react/24/outline";
import {
  LocationInput,
  CurrentWeather,
  WeeklyForecast,
  WeatherAlerts,
  FarmingAdvice,
} from "@components/weather";
import {
  Button,
  Card,
  LoadingSpinner,
  ErrorMessage,
  Select,
} from "@components/common";
import useApp from "@hooks/useApp";
import useLocation from "@hooks/useLocation";
import api, { API_V1 } from "@services/api";
import { getForecast, getAlerts } from "@services/weatherApi";
import { SUPPORTED_CROPS, WEATHER_CACHE_DURATION_MS } from "@utils/constants";
import storage from "@utils/storage";

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

const CACHE_PREFIX = "farmhelp_weather_";

function getCacheKey(pincode) {
  return `${CACHE_PREFIX}${pincode}`;
}

// ---------------------------------------------------------------------------
// Crop options for Select dropdown
// ---------------------------------------------------------------------------

const CROP_OPTIONS = SUPPORTED_CROPS.map((crop) => ({
  value: crop,
  label: crop,
}));

// ---------------------------------------------------------------------------
// FarmingAdviceSection (isolated to allow independent loading)
// ---------------------------------------------------------------------------

function FarmingAdviceSection({ pincode, cropType }) {
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!pincode || !cropType) return;

    const currentId = ++reqIdRef.current;
    setAnalysisLoading(true);

    api
      .post(`${API_V1}/weather/analyze`, {
        pincode,
        crop_type: cropType,
      })
      .then(({ data }) => {
        if (reqIdRef.current !== currentId) return;
        setAnalysis(data);
      })
      .catch(() => {
        if (reqIdRef.current !== currentId) return;
        setAnalysis(null);
      })
      .finally(() => {
        if (reqIdRef.current === currentId) {
          setAnalysisLoading(false);
        }
      });
  }, [pincode, cropType]);

  if (analysisLoading) {
    return (
      <Card variant="default">
        <div className="flex items-center justify-center gap-3 py-6">
          <LoadingSpinner size="sm" />
          <p className="text-sm text-neutral-600">
            Loading farming advice for {cropType}...
          </p>
        </div>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <FarmingAdvice
      recommendations={analysis.recommendations}
      cropType={cropType}
      cropSuitability={analysis.crop_suitability}
      cropProfile={analysis.crop_profile}
    />
  );
}

FarmingAdviceSection.propTypes = {
  pincode: PropTypes.string.isRequired,
  cropType: PropTypes.string.isRequired,
};

// ---------------------------------------------------------------------------
// WeatherPage
// ---------------------------------------------------------------------------

function WeatherPage() {
  const { language } = useApp();
  const {
    pincode: savedPincode,
    setPincode: saveGlobalPincode,
    detectLocation,
    isLoading: detectingLocation,
    error: locationError,
    clearError: clearLocationError,
  } = useLocation();

  // Weather data
  const [forecastData, setForecastData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [activePincode, setActivePincode] = useState("");

  // Crop selection
  const [selectedCrop, setSelectedCrop] = useState("Paddy");

  // Loading / error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const requestIdRef = useRef(0);

  // -------------------------------------------------------------------
  // Fetch weather data (cache-first)
  // -------------------------------------------------------------------

  const fetchWeatherData = useCallback(
    async (pincode, { forceRefresh = false } = {}) => {
      const currentRequestId = ++requestIdRef.current;

      // Check cache
      if (!forceRefresh) {
        const cached = storage.getWithTTL(getCacheKey(pincode));
        if (cached) {
          if (requestIdRef.current !== currentRequestId) return;
          setForecastData(cached.forecast);
          setAlertsData(cached.alerts);
          setLocationInfo(cached.location);
          setActivePincode(pincode);
          setLastRefresh(cached.cachedAt);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const [forecastResult, alertsResult] = await Promise.all([
          getForecast(pincode),
          getAlerts(pincode, { cropType: selectedCrop }).catch(() => null),
        ]);

        if (requestIdRef.current !== currentRequestId) return;

        const forecast = forecastResult.forecast || forecastResult;
        const location = forecastResult.location || null;
        const alerts = alertsResult?.alerts || [];

        setForecastData(forecast);
        setAlertsData(alerts);
        setLocationInfo(location);
        setActivePincode(pincode);

        const now = new Date().toISOString();
        setLastRefresh(now);

        storage.setWithTTL(
          getCacheKey(pincode),
          { forecast, alerts, location, cachedAt: now },
          WEATHER_CACHE_DURATION_MS,
        );

        saveGlobalPincode(pincode);
      } catch (err) {
        if (requestIdRef.current !== currentRequestId) return;
        setError(
          err?.message || "Failed to fetch weather data. Please try again.",
        );
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    },
    [selectedCrop, saveGlobalPincode],
  );

  // Auto-load on mount if pincode exists
  useEffect(() => {
    if (savedPincode && !forecastData && !loading) {
      fetchWeatherData(savedPincode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handlePincodeSubmit = useCallback(
    (pincode) => {
      fetchWeatherData(pincode);
    },
    [fetchWeatherData],
  );

  const handleRefresh = useCallback(() => {
    if (activePincode) {
      fetchWeatherData(activePincode, { forceRefresh: true });
    }
  }, [activePincode, fetchWeatherData]);

  const handleCropChange = useCallback(
    (e) => {
      const crop = e.target.value;
      setSelectedCrop(crop);

      if (activePincode) {
        getAlerts(activePincode, { cropType: crop })
          .then((result) => {
            setAlertsData(result?.alerts || []);
          })
          .catch(() => {
            // Keep existing alerts on failure
          });
      }
    },
    [activePincode],
  );

  const handleDetectLocation = useCallback(() => {
    clearLocationError();
    detectLocation();
  }, [detectLocation, clearLocationError]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  // -------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------

  const hasData = forecastData != null;
  const lastRefreshLabel = lastRefresh
    ? new Date(lastRefresh).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CloudIcon className="h-7 w-7 text-accent-600" aria-hidden="true" />
          <h1 className="text-2xl font-display font-bold text-neutral-900 sm:text-3xl">
            {language === "hi"
              ? "\u092E\u094C\u0938\u092E \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928"
              : "Weather Forecast"}
          </h1>
        </div>
        <p className="text-neutral-600 max-w-2xl">
          {language === "hi"
            ? "\u0905\u092A\u0928\u093E \u092A\u093F\u0928\u0915\u094B\u0921 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902 \u0914\u0930 7 \u0926\u093F\u0928\u094B\u0902 \u0915\u093E \u092E\u094C\u0938\u092E \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928, \u0916\u0947\u0924\u0940 \u0938\u0932\u093E\u0939 \u0914\u0930 \u091A\u0947\u0924\u093E\u0935\u0928\u0940 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0947\u0902\u0964"
            : "Enter your pincode to get a 7-day forecast, farming advice, and weather alerts tailored for your crops."}
        </p>
      </div>

      {/* Location input */}
      <section aria-label="Location input">
        <LocationInput
          onSubmit={handlePincodeSubmit}
          initialPincode={savedPincode}
          loading={loading}
          detectingLocation={detectingLocation}
          onDetectLocation={handleDetectLocation}
        />
        {locationError && (
          <p className="mt-2 text-sm text-danger-600" role="alert">
            {locationError}
          </p>
        )}
      </section>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-12"
          >
            <LoadingSpinner size="lg" />
            <p className="text-sm text-neutral-600">
              {language === "hi"
                ? "\u092E\u094C\u0938\u092E \u0921\u0947\u091F\u093E \u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948..."
                : "Loading weather data..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && !loading && (
        <ErrorMessage
          message={error}
          title="Weather Data Error"
          onRetry={handleRefresh}
          onDismiss={handleDismissError}
        />
      )}

      {/* Weather dashboard */}
      <AnimatePresence>
        {hasData && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Controls bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Select
                name="crop-type"
                label="Select Crop (for tailored advice)"
                options={CROP_OPTIONS}
                value={selectedCrop}
                onChange={handleCropChange}
                placeholder="Select crop type"
                className="sm:max-w-xs"
              />

              <div className="flex items-center gap-3">
                {lastRefreshLabel && (
                  <span className="text-xs text-neutral-500">
                    Updated at {lastRefreshLabel}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Current weather */}
            <CurrentWeather forecast={forecastData} location={locationInfo} />

            {/* Weekly forecast */}
            <WeeklyForecast forecast={forecastData} />

            {/* Weather alerts */}
            <WeatherAlerts alerts={alertsData || []} />

            {/* Farming advice (independent fetch) */}
            <FarmingAdviceSection
              pincode={activePincode}
              cropType={selectedCrop}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WeatherPage;
