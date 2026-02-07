import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "@context/AppContext";
import { VoiceProvider } from "@context/VoiceContext";
import { LocationProvider } from "@context/LocationContext";
import { Layout, PageTransition, LoadingSpinner, ErrorBoundary } from "@components/common";
import useApp from "@hooks/useApp";

// ---------------------------------------------------------------------------
// Lazy-loaded page components (code splitting)
// ---------------------------------------------------------------------------

const HomePage = lazy(() => import("@pages/HomePage"));
const DiseaseDetectionPage = lazy(() => import("@pages/DiseaseDetectionPage"));
const WeatherPage = lazy(() => import("@pages/WeatherPage"));
const APMCPricePage = lazy(() => import("@pages/APMCPricePage"));
const SchemesPage = lazy(() => import("@pages/SchemesPage"));

/**
 * Suspense fallback shown while lazy-loaded pages are being fetched.
 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" message="Loading..." />
    </div>
  );
}

/**
 * Inner application shell that consumes AppContext.
 * Separated so that useApp can access the provider above it.
 */
function AppShell() {
  const { language, toggleLanguage, theme, toggleTheme } = useApp();
  const location = useLocation();

  return (
    <Layout
      language={language}
      onToggleLanguage={toggleLanguage}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/disease" element={<DiseaseDetectionPage />} />
                <Route path="/weather" element={<WeatherPage />} />
                <Route path="/apmc" element={<APMCPricePage />} />
                <Route path="/schemes" element={<SchemesPage />} />
              </Routes>
            </PageTransition>
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

/**
 * Root application component.
 *
 * Wraps the entire tree with context providers:
 *   1. AppProvider       - language, theme, preferences, global loading/error
 *   2. LocationProvider  - user pincode and coordinates
 *   3. VoiceProvider     - speech recognition state
 */
function App() {
  return (
    <AppProvider>
      <LocationProvider>
        <VoiceProvider>
          <AppShell />
        </VoiceProvider>
      </LocationProvider>
    </AppProvider>
  );
}

export default App;
