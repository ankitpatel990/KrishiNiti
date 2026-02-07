/**
 * WeatherAlerts - Farming weather alert cards.
 *
 * Features:
 *  - Alert cards with severity-based styling (danger, warning, info)
 *  - Bilingual titles (English + Hindi)
 *  - Actionable recommendations
 *  - Alert dismissal support
 *  - Empty state when no alerts
 */

import { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge } from "@components/common";

// ---------------------------------------------------------------------------
// Severity configuration
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  danger: {
    icon: ExclamationCircleIcon,
    badge: "danger",
    border: "border-danger-300",
    bg: "bg-danger-50",
    iconColor: "text-danger-600",
    titleColor: "text-danger-800",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    badge: "warning",
    border: "border-secondary-300",
    bg: "bg-secondary-50",
    iconColor: "text-secondary-600",
    titleColor: "text-secondary-800",
  },
  info: {
    icon: InformationCircleIcon,
    badge: "info",
    border: "border-accent-300",
    bg: "bg-accent-50",
    iconColor: "text-accent-600",
    titleColor: "text-accent-800",
  },
};

function getSeverityConfig(severity) {
  return SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
}

function getSeverityLabel(severity) {
  switch (severity) {
    case "danger":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}

// ---------------------------------------------------------------------------
// AlertCard sub-component
// ---------------------------------------------------------------------------

function AlertCard({ alert, onDismiss }) {
  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={[
          "rounded-xl border p-4",
          config.border,
          config.bg,
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-sm font-semibold ${config.titleColor}`}>
                    {alert.title}
                  </h4>
                  <Badge variant={config.badge} size="sm">
                    {getSeverityLabel(alert.severity)}
                  </Badge>
                </div>
                {alert.title_hindi && (
                  <p className="text-xs text-neutral-500 mt-0.5" lang="hi">
                    {alert.title_hindi}
                  </p>
                )}
              </div>

              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(alert.type)}
                  className="shrink-0 rounded-full p-1 text-neutral-400 hover:text-neutral-600 hover:bg-white/60 transition-colors"
                  aria-label={`Dismiss ${alert.title}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Message */}
            <p className="text-sm text-neutral-700 leading-relaxed">
              {alert.message}
            </p>

            {/* Recommendation */}
            {alert.recommendation && (
              <div className="rounded-lg bg-white/70 border border-white px-3 py-2">
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide mb-1">
                  Recommended Action
                </p>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {alert.recommendation}
                </p>
                {alert.recommendation_hindi && (
                  <p
                    className="text-xs text-neutral-500 mt-1 leading-relaxed"
                    lang="hi"
                  >
                    {alert.recommendation_hindi}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

AlertCard.propTypes = {
  alert: PropTypes.shape({
    type: PropTypes.string.isRequired,
    severity: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    title_hindi: PropTypes.string,
    message: PropTypes.string.isRequired,
    recommendation: PropTypes.string,
    recommendation_hindi: PropTypes.string,
  }).isRequired,
  onDismiss: PropTypes.func,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function WeatherAlerts({ alerts = [], className = "" }) {
  const [dismissedTypes, setDismissedTypes] = useState(new Set());

  const handleDismiss = useCallback((alertType) => {
    setDismissedTypes((prev) => new Set([...prev, alertType]));
  }, []);

  const visibleAlerts = alerts.filter(
    (alert) => !dismissedTypes.has(alert.type),
  );

  const dangerCount = visibleAlerts.filter((a) => a.severity === "danger").length;
  const warningCount = visibleAlerts.filter((a) => a.severity === "warning").length;

  // No alerts - show positive message
  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={className}
      >
        <Card variant="flat" className="border border-primary-200 bg-primary-50/50">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon
              className="h-6 w-6 text-primary-600 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-primary-800">
                No Weather Alerts
              </p>
              <p className="text-xs text-primary-600 mt-0.5">
                Weather conditions are favorable. No special precautions needed.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={className}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-neutral-900">
              Weather Alerts
            </h3>
            <Badge variant="default" size="sm">
              {visibleAlerts.length}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {dangerCount > 0 && (
              <Badge variant="danger" size="sm" dot>
                {dangerCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" size="sm" dot>
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>

        {/* Alert cards */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visibleAlerts.map((alert) => (
              <AlertCard
                key={alert.type}
                alert={alert}
                onDismiss={handleDismiss}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* All dismissed message */}
        {visibleAlerts.length === 0 && dismissedTypes.size > 0 && (
          <Card variant="flat" className="border border-neutral-200">
            <p className="text-sm text-neutral-500 text-center">
              All alerts dismissed.
            </p>
          </Card>
        )}
      </div>
    </motion.div>
  );
}

WeatherAlerts.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      severity: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
    }),
  ),
  className: PropTypes.string,
};

export default WeatherAlerts;
