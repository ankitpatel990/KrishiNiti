import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "@context/AppContext";
import { VoiceProvider } from "@context/VoiceContext";
import { LocationProvider } from "@context/LocationContext";
import { AuthProvider } from "@context/AuthContext";
import { Layout, PageTransition, LoadingSpinner, ErrorBoundary } from "@components/common";
import useApp from "@hooks/useApp";

// Initialize i18n
import "@i18n";

// ---------------------------------------------------------------------------
// Lazy-loaded page components (code splitting)
// ---------------------------------------------------------------------------

const HomePage = lazy(() => import("@pages/HomePage"));
const LoginPage = lazy(() => import("@pages/LoginPage"));
const SignupPage = lazy(() => import("@pages/SignupPage"));
const FarmerProfilePage = lazy(() => import("@pages/FarmerProfilePage"));
const FarmerDashboardPage = lazy(() => import("@pages/FarmerDashboardPage"));
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
  const { language, setLanguage } = useApp();
  const location = useLocation();

  return (
    <Layout
      language={language}
      onLanguageChange={setLanguage}
    >
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/profile" element={<FarmerProfilePage />} />
                <Route path="/my-dashboard" element={<FarmerDashboardPage />} />
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
 *   1. AppProvider       - language, preferences, global loading/error
 *   2. LocationProvider  - user pincode and coordinates
 *   3. VoiceProvider     - speech recognition state
 */
function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <LocationProvider>
          <VoiceProvider>
            <AppShell />
          </VoiceProvider>
        </LocationProvider>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
