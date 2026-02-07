/**
 * WeeklyForecast - 7-day forecast display.
 *
 * Features:
 *  - Daily cards with high/low temps, precipitation, weather icon
 *  - Horizontal scroll on mobile with snap-scroll behaviour
 *  - Today badge on the first day
 *  - Temperature bar visualisation relative to the week's range
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Card, Badge } from "@components/common";
import { getWeatherInfo, WEATHER_ICONS } from "./CurrentWeather";

/**
 * Format an ISO date string into a short day label.
 * @param {string} dateStr - ISO date (e.g. "2026-02-07")
 * @param {number} index   - Day index (0 = today)
 * @returns {{ dayName: string, dateLabel: string, isToday: boolean }}
 */
function formatDay(dateStr, index) {
  const isToday = index === 0;
  if (!dateStr) {
    return { dayName: `Day ${index + 1}`, dateLabel: "", isToday };
  }

  const date = new Date(dateStr + "T00:00:00");
  const dayName = isToday
    ? "Today"
    : date.toLocaleDateString("en-IN", { weekday: "short" });
  const dateLabel = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return { dayName, dateLabel, isToday };
}

/**
 * Small inline weather icon (scaled down from the full-size versions).
 */
function SmallWeatherIcon({ iconKey }) {
  const icon = WEATHER_ICONS[iconKey];
  if (!icon) return null;

  return (
    <div className="h-8 w-8 [&>svg]:h-8 [&>svg]:w-8">{icon}</div>
  );
}

SmallWeatherIcon.propTypes = {
  iconKey: PropTypes.string.isRequired,
};

function WeeklyForecast({ forecast, className = "" }) {
  if (!forecast || !forecast.daily) {
    return null;
  }

  const daily = forecast.daily;
  const dates = daily.time || [];
  const tempsMax = daily.temperature_2m_max || [];
  const tempsMin = daily.temperature_2m_min || [];
  const precipitation = daily.precipitation_sum || [];
  const weatherCodes = daily.weathercode || [];

  if (dates.length === 0) {
    return null;
  }

  // Compute week-wide temp range for bar visualisation
  const allTemps = [...tempsMax, ...tempsMin].filter(
    (t) => t != null && !Number.isNaN(t),
  );
  const weekMin = allTemps.length > 0 ? Math.min(...allTemps) : 0;
  const weekMax = allTemps.length > 0 ? Math.max(...allTemps) : 40;
  const tempRange = weekMax - weekMin || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={className}
    >
      <Card variant="default">
        <h3 className="text-base font-semibold text-neutral-900 mb-3">
          7-Day Forecast
        </h3>

        {/* Scrollable container */}
        <div className="overflow-x-auto -mx-5 px-5 pb-2 scrollbar-thin">
          <div className="flex gap-3 min-w-max">
            {dates.map((dateStr, index) => {
              const { dayName, dateLabel, isToday } = formatDay(dateStr, index);
              const tMax = tempsMax[index];
              const tMin = tempsMin[index];
              const precip = precipitation[index] ?? 0;
              const code = weatherCodes[index] ?? 0;
              const weatherInfo = getWeatherInfo(code);

              // Bar position (percentage of week range)
              const barLeft =
                tMin != null ? ((tMin - weekMin) / tempRange) * 100 : 0;
              const barRight =
                tMax != null ? ((tMax - weekMin) / tempRange) * 100 : 100;
              const barWidth = barRight - barLeft;

              return (
                <div
                  key={dateStr || index}
                  className={[
                    "flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 min-w-[100px] transition-colors",
                    isToday
                      ? "border-accent-300 bg-accent-50"
                      : "border-neutral-200 bg-white hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {/* Day label */}
                  <div className="text-center">
                    <p
                      className={[
                        "text-sm font-semibold",
                        isToday ? "text-accent-700" : "text-neutral-800",
                      ].join(" ")}
                    >
                      {dayName}
                    </p>
                    <p className="text-xs text-neutral-500">{dateLabel}</p>
                  </div>

                  {isToday && (
                    <Badge variant="info" size="sm">
                      Today
                    </Badge>
                  )}

                  {/* Weather icon */}
                  <SmallWeatherIcon iconKey={weatherInfo.icon} />

                  {/* Condition label */}
                  <p className="text-xs text-neutral-500 text-center leading-tight">
                    {weatherInfo.label}
                  </p>

                  {/* Temperature range bar */}
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-accent-700 font-medium">
                        {tMax != null ? `${tMax.toFixed(0)}°` : "--"}
                      </span>
                      <span className="text-neutral-500">
                        {tMin != null ? `${tMin.toFixed(0)}°` : "--"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-400 to-secondary-400"
                        style={{
                          marginLeft: `${barLeft}%`,
                          width: `${Math.max(barWidth, 5)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Precipitation */}
                  {precip > 0 && (
                    <p className="text-xs text-accent-600 font-medium">
                      {precip.toFixed(1)} mm
                    </p>
                  )}
                  {precip === 0 && (
                    <p className="text-xs text-neutral-400">No rain</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

WeeklyForecast.propTypes = {
  forecast: PropTypes.shape({
    daily: PropTypes.object,
  }),
  className: PropTypes.string,
};

export default WeeklyForecast;
