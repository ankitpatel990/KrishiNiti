import { Routes, Route } from "react-router-dom";
import { AppProvider } from "@context/AppContext";
import { VoiceProvider } from "@context/VoiceContext";
import { LocationProvider } from "@context/LocationContext";
import { Layout } from "@components/common";
import useApp from "@hooks/useApp";
import DiseaseDetectionPage from "@pages/DiseaseDetectionPage";
import WeatherPage from "@pages/WeatherPage";
import MandiPricesPage from "@pages/MandiPricesPage";

/**
 * Inner application shell that consumes AppContext.
 * Separated so that useApp can access the provider above it.
 */
function AppShell() {
  const { language, toggleLanguage } = useApp();

  return (
    <Layout language={language} onToggleLanguage={toggleLanguage}>
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center animate-fade-in">
                <h1 className="text-4xl font-display font-bold text-primary-700 mb-4">
                  FarmHelp
                </h1>
                <p className="text-lg text-neutral-600 max-w-md mx-auto">
                  AI-powered crop disease detection, weather forecasting,
                  and market price tracking for Indian farmers.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <span className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">
                    Disease Detection
                  </span>
                  <span className="inline-block px-4 py-2 bg-accent-100 text-accent-700 rounded-lg text-sm font-medium">
                    Weather Forecast
                  </span>
                  <span className="inline-block px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium">
                    Mandi Prices
                  </span>
                </div>
              </div>
            </div>
          }
        />
        <Route path="/disease" element={<DiseaseDetectionPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/mandi" element={<MandiPricesPage />} />
      </Routes>
    </Layout>
  );
}

/**
 * Root application component.
 *
 * Wraps the entire tree with context providers:
 *   1. AppProvider      - language, preferences, global loading/error
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
