/**
 * FarmerDashboardPage - Personalized farmer dashboard.
 *
 * Displays:
 * - Personalized weather info based on location
 * - APMC prices for selected crops
 * - Government schemes relevant to user's state
 *
 * Only accessible to logged-in users.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CloudIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  SunIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

import { Card, LoadingSpinner } from "@components/common";
import { useAuth } from "@context/AuthContext";
import { getPrices, getTrends } from "@services/apmcApi";
import { getForecast, getAlerts } from "@services/weatherApi";
import { getSchemesByState } from "@services/schemesApi";
import { ROUTES } from "@utils/constants";

// Animation variants
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// Sub-components
function WeatherCard({ weather, alerts, loading, error, location }) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CloudIcon className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold text-neutral-900">Weather</h3>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" message="Loading weather..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CloudIcon className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold text-neutral-900">Weather</h3>
        </div>
        <p className="text-sm text-neutral-500">{error}</p>
      </Card>
    );
  }

  if (!weather?.forecast?.daily) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CloudIcon className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold text-neutral-900">Weather</h3>
        </div>
        <p className="text-sm text-neutral-500">No weather data available</p>
      </Card>
    );
  }

  const daily = weather.forecast.daily;
  const today = {
    tempMax: daily.temperature_2m_max?.[0] ?? "--",
    tempMin: daily.temperature_2m_min?.[0] ?? "--",
    precipitation: daily.precipitation_sum?.[0] ?? 0,
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CloudIcon className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold text-neutral-900">Weather</h3>
        </div>
        <Link
          to={ROUTES.WEATHER}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          View Full <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
        <MapPinIcon className="h-4 w-4" />
        <span>{location.taluka}, {location.district}</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <p className="text-3xl font-bold text-neutral-900">
            {Math.round(today.tempMax)}°C
          </p>
          <p className="text-sm text-neutral-500">
            Low: {Math.round(today.tempMin)}°C
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-600">
            Precipitation
          </p>
          <p className="text-lg font-semibold text-accent-600">
            {today.precipitation} mm
          </p>
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="border-t border-neutral-200 pt-4">
        <p className="text-xs font-medium text-neutral-500 mb-3">5-Day Forecast</p>
        <div className="grid grid-cols-5 gap-2">
          {daily.time?.slice(0, 5).map((date, idx) => {
            const dayName = new Date(date).toLocaleDateString("en-IN", { weekday: "short" });
            return (
              <div key={date} className="text-center">
                <p className="text-xs text-neutral-500">{dayName}</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {Math.round(daily.temperature_2m_max?.[idx] ?? 0)}°
                </p>
                <p className="text-xs text-neutral-400">
                  {Math.round(daily.temperature_2m_min?.[idx] ?? 0)}°
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {alerts?.alerts?.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Weather Alert</span>
          </div>
          <p className="text-xs text-amber-700">{alerts.alerts[0].message}</p>
        </div>
      )}
    </Card>
  );
}

function CropPriceCard({ crop, priceData, trends, loading }) {
  if (loading) {
    return (
      <div className="p-4 bg-neutral-50 rounded-lg">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  const avgPrice = priceData?.avg_price || priceData?.prices?.[0]?.price_per_quintal;
  const trendDirection = trends?.trend?.direction;
  const trendPercent = trends?.trend?.percent_change;

  return (
    <div className="p-4 bg-neutral-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-neutral-900">{crop}</h4>
        {trendDirection && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trendDirection === "up"
                ? "text-green-600"
                : trendDirection === "down"
                ? "text-red-600"
                : "text-neutral-500"
            }`}
          >
            {trendDirection === "up" ? (
              <ArrowTrendingUpIcon className="h-4 w-4" />
            ) : trendDirection === "down" ? (
              <ArrowTrendingDownIcon className="h-4 w-4" />
            ) : null}
            {trendPercent ? `${Math.abs(trendPercent).toFixed(1)}%` : "Stable"}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-primary-600">
        {avgPrice ? `₹${Math.round(avgPrice).toLocaleString("en-IN")}` : "N/A"}
        <span className="text-sm font-normal text-neutral-500">/qtl</span>
      </p>
      {priceData?.prices?.length > 0 && (
        <p className="text-xs text-neutral-500 mt-1">
          Best: {priceData.prices[0].mandi_name} ({priceData.prices[0].state})
        </p>
      )}
    </div>
  );
}

function APMCPricesCard({ crops, pricesData, trendsData, loading }) {
  if (loading && Object.keys(pricesData).length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CurrencyRupeeIcon className="h-5 w-5 text-secondary-600" />
          <h3 className="font-semibold text-neutral-900">APMC Prices</h3>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" message="Loading prices..." />
        </div>
      </Card>
    );
  }

  if (crops.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CurrencyRupeeIcon className="h-5 w-5 text-secondary-600" />
          <h3 className="font-semibold text-neutral-900">APMC Prices</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-neutral-500 mb-3">
            Add your crops to see personalized APMC prices
          </p>
          <Link
            to={ROUTES.PROFILE}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Go to Profile <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CurrencyRupeeIcon className="h-5 w-5 text-secondary-600" />
          <h3 className="font-semibold text-neutral-900">APMC Prices</h3>
        </div>
        <Link
          to={ROUTES.APMC}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          View All <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-neutral-500 mb-4">Your selected crops</p>

      <div className="space-y-3">
        {crops.map((crop) => (
          <CropPriceCard
            key={crop}
            crop={crop}
            priceData={pricesData[crop]}
            trends={trendsData[crop]}
            loading={loading && !pricesData[crop]}
          />
        ))}
      </div>
    </Card>
  );
}

function SchemesCard({ schemes, loading, error, state }) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DocumentTextIcon className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-neutral-900">Government Schemes</h3>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" message="Loading schemes..." />
        </div>
      </Card>
    );
  }

  if (error || !schemes?.length) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DocumentTextIcon className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-neutral-900">Government Schemes</h3>
        </div>
        <p className="text-sm text-neutral-500">
          {error || "No schemes available for your state"}
        </p>
      </Card>
    );
  }

  const displaySchemes = schemes.slice(0, 4);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-neutral-900">Government Schemes</h3>
        </div>
        <Link
          to={ROUTES.SCHEMES}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          View All <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-neutral-500 mb-4">
        Available for {state}
      </p>

      <div className="space-y-3">
        {displaySchemes.map((scheme) => (
          <div
            key={scheme.id}
            className="p-3 bg-neutral-50 rounded-lg"
          >
            <h4 className="text-sm font-medium text-neutral-900 mb-1 line-clamp-1">
              {scheme.scheme_name}
            </h4>
            <p className="text-xs text-neutral-500 line-clamp-2">
              {scheme.description}
            </p>
            {scheme.benefit_amount && (
              <p className="text-xs font-medium text-green-600 mt-1">
                Benefit: {scheme.benefit_amount}
              </p>
            )}
          </div>
        ))}
      </div>

      {schemes.length > 4 && (
        <p className="text-xs text-neutral-400 text-center mt-4">
          +{schemes.length - 4} more schemes available
        </p>
      )}
    </Card>
  );
}

function NoCropsAlert() {
  const { user } = useAuth();
  
  if (user?.crops?.length > 0) return null;

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3"
    >
      <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-amber-800">
          Add Your Crops
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          Go to your profile and add crops to see personalized APMC price updates.
        </p>
        <Link
          to={ROUTES.PROFILE}
          className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 hover:text-amber-900"
        >
          Add Crops Now
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

// Main Component
function FarmerDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Weather state
  const [weather, setWeather] = useState(null);
  const [weatherAlerts, setWeatherAlerts] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // APMC state
  const [pricesData, setPricesData] = useState({});
  const [trendsData, setTrendsData] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // Schemes state
  const [schemes, setSchemes] = useState([]);
  const [schemesLoading, setSchemesLoading] = useState(true);
  const [schemesError, setSchemesError] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN);
    }
  }, [isAuthenticated, navigate]);

  // Fetch weather based on user location
  useEffect(() => {
    if (!user?.state || !user?.district || !user?.taluka) return;

    async function fetchWeather() {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const location = {
          state: user.state,
          district: user.district,
          taluka: user.taluka,
        };
        const [forecastData, alertsData] = await Promise.all([
          getForecast(location),
          getAlerts(location).catch(() => null),
        ]);
        setWeather(forecastData);
        setWeatherAlerts(alertsData);
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeatherError("Unable to load weather data");
      } finally {
        setWeatherLoading(false);
      }
    }
    fetchWeather();
  }, [user?.state, user?.district, user?.taluka]);

  // Fetch APMC prices for user's crops
  useEffect(() => {
    const crops = user?.crops || [];
    if (crops.length === 0) {
      setPricesData({});
      setTrendsData({});
      return;
    }

    async function fetchPricesForCrops() {
      setPricesLoading(true);
      const newPrices = {};
      const newTrends = {};

      await Promise.all(
        crops.map(async (crop) => {
          try {
            const [priceResult, trendResult] = await Promise.all([
              getPrices({ commodity: crop, state: user.state, limit: 5 }),
              getTrends(crop, { state: user.state, days: 7 }).catch(() => null),
            ]);
            newPrices[crop] = priceResult;
            if (trendResult) newTrends[crop] = trendResult;
          } catch (error) {
            console.error(`Failed to fetch prices for ${crop}:`, error);
          }
        })
      );

      setPricesData(newPrices);
      setTrendsData(newTrends);
      setPricesLoading(false);
    }
    fetchPricesForCrops();
  }, [user?.crops, user?.state]);

  // Fetch schemes for user's state
  useEffect(() => {
    if (!user?.state) return;

    async function fetchSchemes() {
      setSchemesLoading(true);
      setSchemesError(null);
      try {
        const data = await getSchemesByState(user.state);
        setSchemes(data.schemes || []);
      } catch (error) {
        console.error("Failed to fetch schemes:", error);
        setSchemesError("Unable to load schemes");
      } finally {
        setSchemesLoading(false);
      }
    }
    fetchSchemes();
  }, [user?.state]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto px-4 py-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              Welcome, {user.name?.split(" ")[0]}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1 text-neutral-500 text-sm">
                <PhoneIcon className="h-4 w-4" />
                <span>{user.mobile_number}</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-500 text-sm">
                <MapPinIcon className="h-4 w-4" />
                <span>
                  {user.taluka}, {user.district}, {user.state}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Crops Alert */}
      <NoCropsAlert />

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <motion.div variants={itemVariants}>
          <WeatherCard
            weather={weather}
            alerts={weatherAlerts}
            loading={weatherLoading}
            error={weatherError}
            location={{
              taluka: user.taluka,
              district: user.district,
              state: user.state,
            }}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <APMCPricesCard
            crops={user.crops || []}
            pricesData={pricesData}
            trendsData={trendsData}
            loading={pricesLoading}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2">
          <SchemesCard
            schemes={schemes}
            loading={schemesLoading}
            error={schemesError}
            state={user.state}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default FarmerDashboardPage;
