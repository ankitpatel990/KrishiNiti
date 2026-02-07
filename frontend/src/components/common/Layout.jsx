/**
 * Layout - Main page layout wrapper.
 *
 * Composes Header, main content area, Footer, BottomNav, and VoiceButton
 * into a consistent full-page structure. Hides footer on mobile
 * when BottomNav is visible. Supports dark mode via theme prop.
 */

import PropTypes from "prop-types";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import { VoiceButton } from "@components/voice";

function Layout({
  children,
  language,
  onLanguageChange,
  theme,
  onToggleTheme,
  hideHeader = false,
  hideFooter = false,
  hideBottomNav = false,
  className = "",
}) {
  return (
    <div className="flex min-h-screen flex-col transition-colors duration-300">
      {/* Skip-to-content link for accessibility */}
      <a href="#main-content" className="sr-skip-link">
        Skip to main content
      </a>

      {!hideHeader && (
        <Header
          language={language}
          onLanguageChange={onLanguageChange}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      )}

      <main
        id="main-content"
        className={`flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 ${className}`}
      >
        {children}
      </main>

      {!hideFooter && <Footer className="hidden md:block" />}

      {!hideBottomNav && <BottomNav className="md:hidden" />}

      <VoiceButton />
    </div>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  language: PropTypes.string,
  onLanguageChange: PropTypes.func,
  theme: PropTypes.string,
  onToggleTheme: PropTypes.func,
  hideHeader: PropTypes.bool,
  hideFooter: PropTypes.bool,
  hideBottomNav: PropTypes.bool,
  className: PropTypes.string,
};

export default Layout;
