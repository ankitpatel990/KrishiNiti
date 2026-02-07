/**
 * useApp - Custom hook for consuming AppContext.
 *
 * Provides access to global application state and actions:
 *  - language, preferences, loading, error
 *  - setLanguage, toggleLanguage, setPreferences
 *  - setLoading, setError, clearError, resetState
 */

import { useContext } from "react";
import { AppContext } from "@context/AppContext";

/**
 * @returns {Object} AppContext value.
 * @throws {Error} If used outside of an AppProvider.
 */
export default function useApp() {
  const context = useContext(AppContext);

  if (context === null) {
    throw new Error("useApp must be used within an <AppProvider>.");
  }

  return context;
}
