/**
 * useLocation - Custom hook for consuming LocationContext.
 *
 * Provides access to user location state and actions:
 *  - pincode, district, state, coordinates
 *  - isLoading, error, hasLocation, hasCoordinates
 *  - setPincode, setLocation, setCoordinates
 *  - detectLocation, clearLocation, clearError
 */

import { useContext } from "react";
import { LocationContext } from "@context/LocationContext";

/**
 * @returns {Object} LocationContext value.
 * @throws {Error} If used outside of a LocationProvider.
 */
export default function useLocation() {
  const context = useContext(LocationContext);

  if (context === null) {
    throw new Error(
      "useLocation must be used within a <LocationProvider>.",
    );
  }

  return context;
}
