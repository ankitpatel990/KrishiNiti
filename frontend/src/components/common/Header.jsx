/**
 * Header - Top navigation bar with logo, navigation links,
 * language toggle, dark mode toggle, and user profile.
 *
 * Features a subtle gradient background and responsive
 * hamburger menu on mobile.
 */

import { useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Bars3Icon,
  XMarkIcon,
  LanguageIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { ROUTES, LANGUAGES, APP_NAME } from "@utils/constants";
import { useAuth } from "@context/AuthContext";

const NAV_ITEMS = [
  { label: "Home", path: ROUTES.HOME },
  { label: "Disease Detection", path: ROUTES.DISEASE_DETECTION },
  { label: "Weather", path: ROUTES.WEATHER },
  { label: "APMC Price", path: ROUTES.APMC },
  { label: "Schemes", path: ROUTES.SCHEMES },
];

function Header({ language, onToggleLanguage, theme, onToggleTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const toggleMobile = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate(ROUTES.HOME);
    closeMobile();
  }, [logout, navigate, closeMobile]);

  const languageLabel = language === LANGUAGES.HI ? "EN" : "HI";
  const isDark = theme === "dark";

  return (
    <header
      className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm transition-colors duration-300"
      id="app-header"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
            aria-label={`${APP_NAME} home`}
          >
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-header text-white font-display font-bold text-sm shadow-sm">
              FH
            </span>
            <span className="text-lg font-display font-bold text-primary-700 hidden sm:block">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
            id="main-nav"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                id="theme-toggle"
              >
                {isDark ? (
                  <SunIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <MoonIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Language toggle */}
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label={`Switch to ${languageLabel === "HI" ? "Hindi" : "English"}`}
                id="lang-toggle"
              >
                <LanguageIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xs:inline">{languageLabel}</span>
              </button>
            )}

            {/* User Profile / Login */}
            <div className="hidden md:flex items-center gap-1.5">
              {isAuthenticated && user ? (
                <>
                  <Link
                    to={ROUTES.PROFILE}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <UserCircleIcon className="h-5 w-5" aria-hidden="true" />
                    <span className="max-w-[100px] truncate">{user.name?.split(" ")[0]}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <Link
                  to={ROUTES.LOGIN}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  Login
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={toggleMobile}
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden border-t border-neutral-200 bg-white animate-slide-down"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobile}
                  className={[
                    "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-600 hover:bg-neutral-100",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile Auth Links */}
            <div className="border-t border-neutral-200 mt-2 pt-2">
              {isAuthenticated && user ? (
                <>
                  <Link
                    to={ROUTES.PROFILE}
                    onClick={closeMobile}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === ROUTES.PROFILE
                        ? "bg-primary-50 text-primary-700"
                        : "text-neutral-600 hover:bg-neutral-100",
                    ].join(" ")}
                  >
                    <UserCircleIcon className="h-5 w-5" />
                    My Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to={ROUTES.LOGIN}
                  onClick={closeMobile}
                  className="block px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white text-center hover:bg-primary-700 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

Header.propTypes = {
  language: PropTypes.string,
  onToggleLanguage: PropTypes.func,
  theme: PropTypes.string,
  onToggleTheme: PropTypes.func,
};

export default Header;
