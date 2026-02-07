/**
 * HomePage - Main dashboard with feature cards, quick search,
 * and recent activity feed.
 *
 * Serves as the landing page after login / initial load. Provides
 * quick access to all four core features (Disease Detection,
 * Weather Forecast, APMC Price, Schemes) plus a recent activity timeline.
 */

import { useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  CameraIcon,
  CloudIcon,
  CurrencyRupeeIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowRightIcon,
  BoltIcon,
  SignalIcon,
  SignalSlashIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@components/common";
import { ROUTES } from "@utils/constants";
import { getRecentActivities, ACTIVITY_TYPES } from "@utils/activityTracker";
import { timeAgo } from "@utils/helpers";
import useNetworkStatus from "@hooks/useNetworkStatus";
import { useAuth } from "@context/AuthContext";
import PropTypes from "prop-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function useFeatures() {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      key: "disease",
      title: t("features.diseaseDetection.title"),
      description: t("features.diseaseDetection.description"),
      route: ROUTES.DISEASE_DETECTION,
      Icon: CameraIcon,
      color: "primary",
      bgClass: "bg-primary-50",
      textClass: "text-primary-700",
      iconBg: "bg-primary-100",
    },
    {
      key: "weather",
      title: t("features.weather.title"),
      description: t("features.weather.description"),
      route: ROUTES.WEATHER,
      Icon: CloudIcon,
      color: "accent",
      bgClass: "bg-accent-50",
      textClass: "text-accent-700",
      iconBg: "bg-accent-100",
    },
    {
      key: "apmc",
      title: t("features.apmc.title"),
      description: t("features.apmc.description"),
      route: ROUTES.APMC,
      Icon: CurrencyRupeeIcon,
      color: "secondary",
      bgClass: "bg-secondary-50",
      textClass: "text-secondary-700",
      iconBg: "bg-secondary-100",
    },
    {
      key: "schemes",
      title: t("features.schemes.title"),
      description: t("features.schemes.description"),
      route: ROUTES.SCHEMES,
      Icon: DocumentTextIcon,
      color: "success",
      bgClass: "bg-green-50",
      textClass: "text-green-700",
      iconBg: "bg-green-100",
    },
  ], [t]);
}

const SEARCH_ROUTES = [
  { keywords: ["disease", "crop", "plant", "leaf", "detect", "photo", "scan"], route: ROUTES.DISEASE_DETECTION },
  { keywords: ["weather", "rain", "temperature", "forecast", "wind", "humidity"], route: ROUTES.WEATHER },
  { keywords: ["apmc", "mandi", "price", "market", "sell", "buy", "commodity", "rate"], route: ROUTES.APMC },
  { keywords: ["scheme", "schemes", "government", "subsidy", "insurance", "benefit", "yojana"], route: ROUTES.SCHEMES },
];

const ACTIVITY_ICONS = {
  [ACTIVITY_TYPES.DISEASE]: CameraIcon,
  [ACTIVITY_TYPES.WEATHER]: CloudIcon,
  [ACTIVITY_TYPES.APMC]: CurrencyRupeeIcon,
  [ACTIVITY_TYPES.VOICE]: BoltIcon,
  [ACTIVITY_TYPES.SEARCH]: MagnifyingGlassIcon,
};

const ACTIVITY_COLORS = {
  [ACTIVITY_TYPES.DISEASE]: "text-primary-600 bg-primary-50",
  [ACTIVITY_TYPES.WEATHER]: "text-accent-600 bg-accent-50",
  [ACTIVITY_TYPES.APMC]: "text-secondary-600 bg-secondary-50",
  [ACTIVITY_TYPES.VOICE]: "text-purple-600 bg-purple-50",
  [ACTIVITY_TYPES.SEARCH]: "text-neutral-600 bg-neutral-100",
};

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GreetingBanner() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const hour = new Date().getHours();
  let greeting = t("home.greeting.morning");
  if (hour >= 12 && hour < 17) greeting = t("home.greeting.afternoon");
  else if (hour >= 17) greeting = t("home.greeting.evening");

  const firstName = user?.name?.split(" ")[0];

  return (
    <motion.div variants={itemVariants}>
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        {greeting}{isAuthenticated && firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-xl">
        {t("home.tagline")}
      </p>
    </motion.div>
  );
}

function QuickSearch({ onSearch }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch],
  );

  return (
    <motion.form
      variants={itemVariants}
      onSubmit={handleSubmit}
      className="relative max-w-lg"
      role="search"
      aria-label={t("common.search")}
    >
      <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("home.searchPlaceholder")}
        className="w-full rounded-xl border border-neutral-200 bg-white dark:bg-neutral-800 dark:border-neutral-700 py-3 pl-11 pr-4 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        aria-label={t("common.search")}
      />
    </motion.form>
  );
}

QuickSearch.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

function FeatureCard({ feature }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { Icon } = feature;

  return (
    <motion.div variants={itemVariants}>
      <Card
        hoverable
        onClick={() => navigate(feature.route)}
        className="h-full"
      >
        <div className="flex items-start gap-4">
          <div
            className={`shrink-0 rounded-xl p-3 ${feature.iconBg}`}
          >
            <Icon className={`h-6 w-6 ${feature.textClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold ${feature.textClass} mb-1`}>
              {feature.title}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {feature.description}
            </p>
            <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
              {t("common.getStarted")}
              <ArrowRightIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

FeatureCard.propTypes = {
  feature: PropTypes.shape({
    key: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    route: PropTypes.string.isRequired,
    Icon: PropTypes.elementType.isRequired,
    textClass: PropTypes.string.isRequired,
    iconBg: PropTypes.string.isRequired,
  }).isRequired,
};

function NetworkBanner({ isOnline }) {
  const { t } = useTranslation();
  
  if (isOnline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-lg bg-secondary-50 border border-secondary-200 p-3 flex items-center gap-3"
    >
      <SignalSlashIcon className="h-5 w-5 text-secondary-600 shrink-0" />
      <p className="text-sm text-secondary-800">
        {t("common.offline")}
      </p>
    </motion.div>
  );
}

function CropsAlertBanner() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  // Show alert only for logged-in users without crops
  if (!isAuthenticated || !user) return null;
  if (user.crops && user.crops.length > 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3"
    >
      <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-amber-800">
          {t("home.completeProfile")}
        </h3>
        <p className="text-sm text-amber-700 mt-1">
          {t("home.addCropsMessage")}
        </p>
        <Link
          to={ROUTES.PROFILE}
          className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 hover:text-amber-900"
        >
          {t("home.addCropsNow")}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

NetworkBanner.propTypes = {
  isOnline: PropTypes.bool.isRequired,
};

function RecentActivity() {
  const { t } = useTranslation();
  const activities = useMemo(() => getRecentActivities(8), []);

  if (activities.length === 0) {
    return null;
  }

  return (
    <motion.div variants={itemVariants}>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
        <ClockIcon className="h-5 w-5 text-neutral-500" />
        {t("home.recentActivity")}
      </h2>
      <div className="space-y-2">
        {activities.map((activity) => {
          const IconComp = ACTIVITY_ICONS[activity.type] || BoltIcon;
          const colorClasses = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.search;

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg border border-neutral-100 bg-white p-3 transition-colors hover:bg-neutral-50"
            >
              <div className={`shrink-0 rounded-lg p-2 ${colorClasses}`}>
                <IconComp className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">
                  {activity.title}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {activity.description}
                </p>
              </div>
              <span className="text-xs text-neutral-400 whitespace-nowrap">
                {timeAgo(activity.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function QuickStats() {
  const { t } = useTranslation();
  const isOnline = useNetworkStatus();

  return (
    <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
      <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 text-center">
        <CameraIcon className="h-6 w-6 text-primary-600 mx-auto mb-1" />
        <p className="text-xs text-primary-700 font-medium">{t("features.diseaseDetection.title")}</p>
        <p className="text-xs text-primary-500 mt-0.5">{t("features.diseaseDetection.aiPowered")}</p>
      </div>
      <div className="rounded-xl bg-accent-50 border border-accent-100 p-4 text-center">
        <CloudIcon className="h-6 w-6 text-accent-600 mx-auto mb-1" />
        <p className="text-xs text-accent-700 font-medium">{t("features.weather.sevenDay")}</p>
        <p className="text-xs text-accent-500 mt-0.5">{t("features.weather.pincodeBased")}</p>
      </div>
      <div className="rounded-xl bg-secondary-50 border border-secondary-100 p-4 text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          {isOnline ? (
            <SignalIcon className="h-6 w-6 text-secondary-600" />
          ) : (
            <SignalSlashIcon className="h-6 w-6 text-secondary-400" />
          )}
        </div>
        <p className="text-xs text-secondary-700 font-medium">{t("features.apmc.livePrices")}</p>
        <p className="text-xs text-secondary-500 mt-0.5">
          {isOnline ? t("common.connected") : "Offline"}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function HomePage() {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const features = useFeatures();

  const handleSearch = useCallback(
    (query) => {
      const lowerQuery = query.toLowerCase();
      for (const entry of SEARCH_ROUTES) {
        if (entry.keywords.some((kw) => lowerQuery.includes(kw))) {
          navigate(entry.route);
          return;
        }
      }
      navigate(ROUTES.DISEASE_DETECTION);
    },
    [navigate],
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-8"
    >
      <NetworkBanner isOnline={isOnline} />
      <CropsAlertBanner />
      <GreetingBanner />
      <QuickSearch onSearch={handleSearch} />
      <QuickStats />

      {/* Feature Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <FeatureCard key={feature.key} feature={feature} />
        ))}
      </div>

      <RecentActivity />
    </motion.div>
  );
}

export default HomePage;
