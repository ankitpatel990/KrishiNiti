/**
 * BottomNav - Mobile bottom navigation bar.
 *
 * Fixed to the bottom of the viewport on mobile screens.
 * Hidden on desktop via className prop (default usage in Layout).
 */

import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import {
  HomeIcon,
  CameraIcon,
  CloudIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  CameraIcon as CameraIconSolid,
  CloudIcon as CloudIconSolid,
  CurrencyRupeeIcon as CurrencyRupeeIconSolid,
} from "@heroicons/react/24/solid";
import { ROUTES } from "@utils/constants";

const NAV_ITEMS = [
  {
    label: "Home",
    path: ROUTES.HOME,
    Icon: HomeIcon,
    ActiveIcon: HomeIconSolid,
  },
  {
    label: "Disease",
    path: ROUTES.DISEASE_DETECTION,
    Icon: CameraIcon,
    ActiveIcon: CameraIconSolid,
  },
  {
    label: "Weather",
    path: ROUTES.WEATHER,
    Icon: CloudIcon,
    ActiveIcon: CloudIconSolid,
  },
  {
    label: "Mandi",
    path: ROUTES.MANDI,
    Icon: CurrencyRupeeIcon,
    ActiveIcon: CurrencyRupeeIconSolid,
  },
];

function BottomNav({ className = "" }) {
  const location = useLocation();

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur-sm safe-area-bottom ${className}`}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = isActive ? item.ActiveIcon : item.Icon;

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
              aria-label={item.label}
            >
              <IconComponent className="h-6 w-6" aria-hidden="true" />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
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
