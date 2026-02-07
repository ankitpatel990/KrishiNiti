/**
 * CurrentWeather - Today's weather summary display.
 *
 * Shows:
 *  - Current temperature (large display)
 *  - Weather condition icon and description
 *  - High / low temperature range
 *  - Humidity percentage
 *  - Wind speed
 *  - Precipitation
 *  - Location name
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Card, Badge } from "@components/common";

// ---------------------------------------------------------------------------
// WMO Weather Code mapping
// https://open-meteo.com/en/docs -> WMO Weather interpretation codes
// ---------------------------------------------------------------------------

const WMO_CODES = {
  0: { label: "Clear Sky", icon: "sun" },
  1: { label: "Mainly Clear", icon: "sun" },
  2: { label: "Partly Cloudy", icon: "cloud-sun" },
  3: { label: "Overcast", icon: "cloud" },
  45: { label: "Foggy", icon: "fog" },
  48: { label: "Rime Fog", icon: "fog" },
  51: { label: "Light Drizzle", icon: "drizzle" },
  53: { label: "Moderate Drizzle", icon: "drizzle" },
  55: { label: "Dense Drizzle", icon: "drizzle" },
  61: { label: "Slight Rain", icon: "rain" },
  63: { label: "Moderate Rain", icon: "rain" },
  65: { label: "Heavy Rain", icon: "heavy-rain" },
  71: { label: "Slight Snow", icon: "snow" },
  73: { label: "Moderate Snow", icon: "snow" },
  75: { label: "Heavy Snow", icon: "snow" },
  80: { label: "Slight Showers", icon: "rain" },
  81: { label: "Moderate Showers", icon: "rain" },
  82: { label: "Violent Showers", icon: "heavy-rain" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Thunderstorm with Hail", icon: "storm" },
  99: { label: "Severe Thunderstorm", icon: "storm" },
};

const WEATHER_ICONS = {
  sun: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="12" fill="#FBBF24" />
      <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round">
        <line x1="32" y1="6" x2="32" y2="14" />
        <line x1="32" y1="50" x2="32" y2="58" />
        <line x1="6" y1="32" x2="14" y2="32" />
        <line x1="50" y1="32" x2="58" y2="32" />
        <line x1="13.6" y1="13.6" x2="19.3" y2="19.3" />
        <line x1="44.7" y1="44.7" x2="50.4" y2="50.4" />
        <line x1="13.6" y1="50.4" x2="19.3" y2="44.7" />
        <line x1="44.7" y1="19.3" x2="50.4" y2="13.6" />
      </g>
    </svg>
  ),
  "cloud-sun": (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="9" fill="#FBBF24" />
      <g stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round">
        <line x1="22" y1="5" x2="22" y2="10" />
        <line x1="22" y1="34" x2="22" y2="38" />
        <line x1="5" y1="22" x2="10" y2="22" />
        <line x1="9" y1="9" x2="13" y2="13" />
        <line x1="9" y1="35" x2="13" y2="31" />
      </g>
      <path d="M20 42 C20 34 26 28 34 28 C38 28 42 30 44 33 C48 33 52 37 52 42 C52 47 48 50 44 50 L26 50 C22 50 20 47 20 42Z" fill="#CBD5E1" />
    </svg>
  ),
  cloud: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M16 44 C16 36 22 28 32 28 C38 28 42 30 44 34 C50 34 56 38 56 44 C56 50 50 54 44 54 L24 54 C20 54 16 50 16 44Z" fill="#94A3B8" />
    </svg>
  ),
  fog: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="#94A3B8" strokeWidth="3" strokeLinecap="round">
        <line x1="12" y1="24" x2="52" y2="24" />
        <line x1="16" y1="32" x2="48" y2="32" />
        <line x1="12" y1="40" x2="52" y2="40" />
        <line x1="16" y1="48" x2="48" y2="48" />
      </g>
    </svg>
  ),
  drizzle: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 36 C14 28 20 22 28 22 C34 22 38 24 40 28 C46 28 50 32 50 36 C50 41 46 44 42 44 L22 44 C18 44 14 41 14 36Z" fill="#94A3B8" />
      <g stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">
        <line x1="22" y1="48" x2="22" y2="52" />
        <line x1="32" y1="50" x2="32" y2="54" />
        <line x1="42" y1="48" x2="42" y2="52" />
      </g>
    </svg>
  ),
  rain: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 34 C14 26 20 20 28 20 C34 20 38 22 40 26 C46 26 50 30 50 34 C50 39 46 42 42 42 L22 42 C18 42 14 39 14 34Z" fill="#64748B" />
      <g stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round">
        <line x1="20" y1="46" x2="18" y2="54" />
        <line x1="28" y1="48" x2="26" y2="56" />
        <line x1="36" y1="46" x2="34" y2="54" />
        <line x1="44" y1="48" x2="42" y2="56" />
      </g>
    </svg>
  ),
  "heavy-rain": (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 32 C14 24 20 18 28 18 C34 18 38 20 40 24 C46 24 50 28 50 32 C50 37 46 40 42 40 L22 40 C18 40 14 37 14 32Z" fill="#475569" />
      <g stroke="#2563EB" strokeWidth="3" strokeLinecap="round">
        <line x1="18" y1="44" x2="14" y2="56" />
        <line x1="26" y1="46" x2="22" y2="58" />
        <line x1="34" y1="44" x2="30" y2="56" />
        <line x1="42" y1="46" x2="38" y2="58" />
        <line x1="50" y1="44" x2="46" y2="56" />
      </g>
    </svg>
  ),
  snow: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 34 C14 26 20 20 28 20 C34 20 38 22 40 26 C46 26 50 30 50 34 C50 39 46 42 42 42 L22 42 C18 42 14 39 14 34Z" fill="#94A3B8" />
      <g fill="#BFDBFE">
        <circle cx="20" cy="50" r="2.5" />
        <circle cx="32" cy="52" r="2.5" />
        <circle cx="44" cy="50" r="2.5" />
        <circle cx="26" cy="56" r="2" />
        <circle cx="38" cy="56" r="2" />
      </g>
    </svg>
  ),
  storm: (
    <svg className="h-16 w-16" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M14 30 C14 22 20 16 28 16 C34 16 38 18 40 22 C46 22 50 26 50 30 C50 35 46 38 42 38 L22 38 C18 38 14 35 14 30Z" fill="#475569" />
      <polygon points="30,40 24,52 32,50 28,60 38,46 30,48" fill="#FBBF24" />
    </svg>
  ),
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { label: "Unknown", icon: "cloud" };
}

function CurrentWeather({ forecast, location, className = "" }) {
  if (!forecast || !forecast.daily) {
    return null;
  }

  const daily = forecast.daily;
  const todayIndex = 0;

  const tempMax = daily.temperature_2m_max?.[todayIndex];
  const tempMin = daily.temperature_2m_min?.[todayIndex];
  const precipitation = daily.precipitation_sum?.[todayIndex] ?? 0;
  const windSpeed = daily.windspeed_10m_max?.[todayIndex] ?? 0;
  const humidity = daily.relative_humidity_2m_max?.[todayIndex] ?? 0;
  const weatherCode = daily.weathercode?.[todayIndex] ?? 0;
  const date = daily.time?.[todayIndex];

  const weatherInfo = getWeatherInfo(weatherCode);
  const avgTemp = tempMax != null && tempMin != null
    ? ((tempMax + tempMin) / 2).toFixed(1)
    : null;

  const locationLabel = location
    ? [location.city, location.state].filter(Boolean).join(", ")
    : "";

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        variant="default"
        className={`bg-gradient-to-br from-accent-50 to-accent-100 border-accent-200 ${className}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Temperature + condition */}
          <div className="flex items-center gap-4">
            {/* Weather icon */}
            <div className="shrink-0">
              {WEATHER_ICONS[weatherInfo.icon] || WEATHER_ICONS.cloud}
            </div>

            <div>
              {/* Temperature */}
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-display font-bold text-neutral-900 tabular-nums">
                  {avgTemp ?? "--"}
                </span>
                <span className="text-2xl text-neutral-500">°C</span>
              </div>

              {/* Condition */}
              <p className="text-sm font-medium text-neutral-700 mt-0.5">
                {weatherInfo.label}
              </p>

              {/* High / Low */}
              {tempMax != null && tempMin != null && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  H: {tempMax.toFixed(1)}°C &nbsp; L: {tempMin.toFixed(1)}°C
                </p>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {/* Humidity */}
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Humidity</p>
              <p className="text-lg font-semibold text-neutral-800 tabular-nums mt-0.5">
                {humidity}%
              </p>
            </div>

            {/* Wind */}
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Wind</p>
              <p className="text-lg font-semibold text-neutral-800 tabular-nums mt-0.5">
                {windSpeed.toFixed(0)}
                <span className="text-xs font-normal ml-0.5">km/h</span>
              </p>
            </div>

            {/* Rain */}
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Rain</p>
              <p className="text-lg font-semibold text-neutral-800 tabular-nums mt-0.5">
                {precipitation.toFixed(1)}
                <span className="text-xs font-normal ml-0.5">mm</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer: location + date */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-accent-200/60">
          {locationLabel && (
            <Badge variant="info" size="sm" dot>
              {locationLabel}
            </Badge>
          )}
          {formattedDate && (
            <span className="text-xs text-neutral-500">{formattedDate}</span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

CurrentWeather.propTypes = {
  forecast: PropTypes.shape({
    daily: PropTypes.object,
  }),
  location: PropTypes.shape({
    city: PropTypes.string,
    state: PropTypes.string,
  }),
  className: PropTypes.string,
};

export { getWeatherInfo, WEATHER_ICONS };
export default CurrentWeather;
