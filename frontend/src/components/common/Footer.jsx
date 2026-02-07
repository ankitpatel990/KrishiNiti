/**
 * Footer - Application footer with links and branding.
 *
 * Responsive layout: stacks vertically on mobile,
 * side-by-side on desktop.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { ROUTES, APP_NAME } from "@utils/constants";

function Footer({ className = "" }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const FOOTER_LINKS = useMemo(() => [
    { label: t("nav.diseaseDetection"), path: ROUTES.DISEASE_DETECTION },
    { label: t("nav.weather"), path: ROUTES.WEATHER },
    { label: t("nav.apmcPrice"), path: ROUTES.APMC },
  ], [t]);

  return (
    <footer
      className={`border-t border-neutral-200 bg-white ${className}`}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Branding */}
          <div>
            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
            >
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary-600 text-white font-display font-bold text-xs">
                FH
              </span>
              <span className="text-base font-display font-bold text-primary-700">
                {APP_NAME}
              </span>
            </Link>
            <p className="mt-2 text-sm text-neutral-500 max-w-xs">
              {t("home.tagline")}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-neutral-600 hover:text-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-6 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-400 text-center md:text-left">
            {year} {t("footer.copyright")} {t("footer.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}

Footer.propTypes = {
  className: PropTypes.string,
};

export default Footer;
