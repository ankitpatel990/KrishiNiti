/**
 * BottomNav - Mobile bottom navigation bar.
 *
 * Fixed to the bottom of the viewport on mobile screens.
 * Hidden on desktop via className prop (default usage in Layout).
 */

import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import {
  HomeIcon,
  CameraIcon,
  CloudIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  CameraIcon as CameraIconSolid,
  CloudIcon as CloudIconSolid,
  CurrencyRupeeIcon as CurrencyRupeeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
} from "@heroicons/react/24/solid";
import { ROUTES } from "@utils/constants";

function BottomNav({ className = "" }) {
  const { t } = useTranslation();
  const location = useLocation();

  const NAV_ITEMS = useMemo(() => [
    {
      labelKey: "nav.home",
      path: ROUTES.HOME,
      Icon: HomeIcon,
      ActiveIcon: HomeIconSolid,
    },
    {
      labelKey: "nav.diseaseDetection",
      path: ROUTES.DISEASE_DETECTION,
      Icon: CameraIcon,
      ActiveIcon: CameraIconSolid,
    },
    {
      labelKey: "nav.weather",
      path: ROUTES.WEATHER,
      Icon: CloudIcon,
      ActiveIcon: CloudIconSolid,
    },
    {
      labelKey: "nav.apmcPrice",
      path: ROUTES.APMC,
      Icon: CurrencyRupeeIcon,
      ActiveIcon: CurrencyRupeeIconSolid,
    },
    {
      labelKey: "nav.schemes",
      path: ROUTES.SCHEMES,
      Icon: DocumentTextIcon,
      ActiveIcon: DocumentTextIconSolid,
    },
  ], []);

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur-sm safe-area-bottom ${className}`}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = isActive ? item.ActiveIcon : item.Icon;
          const label = t(item.labelKey);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[4rem]",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500",
                isActive
                  ? "text-primary-700"
                  : "text-neutral-500 hover:text-neutral-700",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
            >
              <IconComponent className="h-6 w-6" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight truncate max-w-[4rem]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

BottomNav.propTypes = {
  className: PropTypes.string,
};

export default BottomNav;
