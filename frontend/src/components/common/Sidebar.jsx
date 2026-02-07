/**
 * Sidebar - Desktop side navigation panel.
 *
 * Renders a collapsible sidebar with navigation links.
 * Supports expanded and collapsed (icon-only) modes.
 */

import { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import {
  HomeIcon,
  CameraIcon,
  CloudIcon,
  CurrencyRupeeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { ROUTES, APP_NAME } from "@utils/constants";

const NAV_ITEMS = [
  { label: "Home", path: ROUTES.HOME, Icon: HomeIcon },
  { label: "Disease Detection", path: ROUTES.DISEASE_DETECTION, Icon: CameraIcon },
  { label: "Weather", path: ROUTES.WEATHER, Icon: CloudIcon },
  { label: "Mandi Prices", path: ROUTES.MANDI, Icon: CurrencyRupeeIcon },
];

function Sidebar({
  defaultCollapsed = false,
  className = "",
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const location = useLocation();

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <aside
      className={[
        "flex flex-col border-r border-neutral-200 bg-white transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
        className,
      ].join(" ")}
      aria-label="Side navigation"
    >
      {/* Header / Logo */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-3">
        {!collapsed && (
          <span className="font-display font-bold text-primary-700 text-sm truncate">
            {APP_NAME}
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary-500",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                collapsed ? "justify-center" : "",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

Sidebar.propTypes = {
  defaultCollapsed: PropTypes.bool,
  className: PropTypes.string,
};

export default Sidebar;
