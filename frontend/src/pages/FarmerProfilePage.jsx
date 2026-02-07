/**
 * FarmerProfilePage - Personalized farmer dashboard.
 *
 * Displays:
 * - User profile with edit capability
 * - Personalized weather info based on location
 * - APMC prices for selected crops
 * - Government schemes relevant to user's state
 *
 * Only accessible to logged-in users.
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CheckIcon,
  XMarkIcon,
  CloudIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  SunIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

import { Input, Button, Card, Select, LoadingSpinner, Tabs } from "@components/common";
import { useAuth } from "@context/AuthContext";
import { updateProfile } from "@services/authApi";
import { getCommodities, getPrices, getTrends } from "@services/apmcApi";
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

// Weather icon mapping
function getWeatherIcon(code) {
  if (code <= 3) return SunIcon;
  return CloudIcon;
}

// Sub-components
function WeatherCard({ weather, alerts, loading, error, location }) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CloudIcon className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">Weather</h3>
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Weather</h3>
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Weather</h3>
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
    weatherCode: daily.weather_code?.[0] ?? 0,
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CloudIcon className="h-5 w-5 text-accent-600" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">Weather</h3>
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
          <p className="text-3xl font-bold text-neutral-900 dark:text-white">
            {Math.round(today.tempMax)}°C
          </p>
          <p className="text-sm text-neutral-500">
            Low: {Math.round(today.tempMin)}°C
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Precipitation
          </p>
          <p className="text-lg font-semibold text-accent-600">
            {today.precipitation} mm
          </p>
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
        <p className="text-xs font-medium text-neutral-500 mb-3">5-Day Forecast</p>
        <div className="grid grid-cols-5 gap-2">
          {daily.time?.slice(0, 5).map((date, idx) => {
            const dayName = new Date(date).toLocaleDateString("en-IN", { weekday: "short" });
            return (
              <div key={date} className="text-center">
                <p className="text-xs text-neutral-500">{dayName}</p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
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
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  const avgPrice = priceData?.avg_price || priceData?.prices?.[0]?.price_per_quintal;
  const trendDirection = trends?.trend?.direction;
  const trendPercent = trends?.trend?.percent_change;

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-neutral-900 dark:text-white">{crop}</h4>
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

function APMCPricesCard({ crops, pricesData, trendsData, loading, error }) {
  if (loading && Object.keys(pricesData).length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CurrencyRupeeIcon className="h-5 w-5 text-secondary-600" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">APMC Prices</h3>
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">APMC Prices</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-neutral-500 mb-3">
            Add your crops to see personalized APMC prices
          </p>
          <p className="text-xs text-neutral-400">
            Scroll down to add crops in your profile
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CurrencyRupeeIcon className="h-5 w-5 text-secondary-600" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">APMC Prices</h3>
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Government Schemes</h3>
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Government Schemes</h3>
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Government Schemes</h3>
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
            className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
          >
            <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-1 line-clamp-1">
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

function ProfileEditSection({
  user,
  formData,
  setFormData,
  errors,
  setErrors,
  loading,
  commodities,
  commoditiesLoading,
  selectedCrop,
  setSelectedCrop,
  onSubmit,
  onAddCrop,
  onRemoveCrop,
}) {
  const handleNameChange = useCallback(
    (e) => {
      setFormData((prev) => ({ ...prev, name: e.target.value }));
      setErrors((prev) => ({ ...prev, name: null }));
    },
    [setFormData, setErrors]
  );

  const availableCropOptions = commodities
    .filter((crop) => !formData.crops.includes(crop))
    .map((crop) => ({ value: crop, label: crop }));

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <PencilIcon className="h-5 w-5 text-primary-600" />
        <h3 className="font-semibold text-neutral-900 dark:text-white">Edit Profile</h3>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Input
          name="name"
          label="Full Name"
          type="text"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleNameChange}
          error={errors.name}
          required
          maxLength={100}
          disabled={loading}
        />

        {/* Crops Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            My Crops (Max 2)
          </label>

          {formData.crops.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.crops.map((crop) => (
                <div
                  key={crop}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
                >
                  <CheckIcon className="h-4 w-4" />
                  {crop}
                  <button
                    type="button"
                    onClick={() => onRemoveCrop(crop)}
                    className="ml-1 hover:text-primary-900 focus:outline-none"
                    disabled={loading}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {formData.crops.length < 2 && (
            <div className="flex gap-2">
              {commoditiesLoading ? (
                <div className="flex-1 flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" message="Loading crops..." />
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <Select
                      name="selectedCrop"
                      placeholder="Select a crop to add"
                      options={availableCropOptions}
                      value={selectedCrop}
                      onChange={(e) => setSelectedCrop(e.target.value)}
                      disabled={loading || availableCropOptions.length === 0}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onAddCrop}
                    disabled={loading || !selectedCrop}
                  >
                    Add
                  </Button>
                </>
              )}
            </div>
          )}

          {formData.crops.length === 0 && (
            <p className="mt-2 text-sm text-neutral-500">
              Add crops to see personalized APMC prices above
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" fullWidth loading={loading}>
          Save Changes
        </Button>
      </form>
    </Card>
  );
}

// Main Component
function FarmerProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({ name: "", crops: [] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState("");

  // Commodities
  const [commodities, setCommodities] = useState([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(true);

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

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        crops: user.crops || [],
      });
    }
  }, [user]);

  // Fetch commodities
  useEffect(() => {
    async function fetchCommodities() {
      try {
        const data = await getCommodities();
        const commodityList = data.commodities?.map((c) => c.commodity) || [];
        setCommodities(commodityList);
      } catch (error) {
        console.error("Failed to fetch commodities:", error);
      } finally {
        setCommoditiesLoading(false);
      }
    }
    fetchCommodities();
  }, []);

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

  // Handlers
  const handleAddCrop = useCallback(() => {
    if (!selectedCrop) return;
    if (formData.crops.length >= 2) {
      toast.error("Maximum 2 crops allowed");
      return;
    }
    if (formData.crops.includes(selectedCrop)) {
      toast.error("Crop already added");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      crops: [...prev.crops, selectedCrop],
    }));
    setSelectedCrop("");
  }, [selectedCrop, formData.crops]);

  const handleRemoveCrop = useCallback((cropToRemove) => {
    setFormData((prev) => ({
      ...prev,
      crops: prev.crops.filter((crop) => crop !== cropToRemove),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!formData.name || !formData.name.trim()) {
        setErrors({ name: "Name is required" });
        return;
      }
      if (formData.name.trim().length < 2) {
        setErrors({ name: "Name must be at least 2 characters" });
        return;
      }

      setLoading(true);
      try {
        const updatedUser = await updateProfile(user.mobile_number, {
          name: formData.name.trim(),
          crops: formData.crops,
        });
        updateUser(updatedUser);
        toast.success("Profile updated successfully");
      } catch (error) {
        toast.error(error.message || "Failed to update profile");
      } finally {
        setLoading(false);
      }
    },
    [formData, user, updateUser]
  );

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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
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

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Weather & Prices */}
        <div className="lg:col-span-2 space-y-6">
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

          <motion.div variants={itemVariants}>
            <SchemesCard
              schemes={schemes}
              loading={schemesLoading}
              error={schemesError}
              state={user.state}
            />
          </motion.div>
        </div>

        {/* Right Column - Profile Edit */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <ProfileEditSection
              user={user}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              loading={loading}
              commodities={commodities}
              commoditiesLoading={commoditiesLoading}
              selectedCrop={selectedCrop}
              setSelectedCrop={setSelectedCrop}
              onSubmit={handleSubmit}
              onAddCrop={handleAddCrop}
              onRemoveCrop={handleRemoveCrop}
            />
          </motion.div>

          {/* Account Info */}
          <motion.div variants={itemVariants}>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 text-center">
                Account created on{" "}
                {new Date(user.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default FarmerProfilePage;
