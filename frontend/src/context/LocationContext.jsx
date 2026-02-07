/* eslint-disable react-refresh/only-export-components */
/**
 * LocationContext - User location state management.
 *
 * Manages:
 *  - User location (state, district, taluka) with localStorage persistence
 *  - GPS coordinates (latitude / longitude)
 *  - Loading and error states for location operations
 */

import {
  createContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import storage from "@utils/storage";
import { STORAGE_KEYS } from "@utils/constants";

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

function buildInitialState() {
  const savedLocation = storage.get(STORAGE_KEYS.LOCATION, null);

  return {
    taluka: savedLocation?.taluka || "",
    district: savedLocation?.district || "",
    state: savedLocation?.state || "",
    coordinates: {
      latitude: null,
      longitude: null,
    },
    isLoading: false,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

const ACTION_TYPES = {
  SET_LOCATION: "SET_LOCATION",
  SET_COORDINATES: "SET_COORDINATES",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  CLEAR_LOCATION: "CLEAR_LOCATION",
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function locationReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOCATION:
      return {
        ...state,
        taluka: action.payload.taluka || "",
        district: action.payload.district || "",
        state: action.payload.state || "",
        coordinates: action.payload.coordinates || state.coordinates,
        isLoading: false,
        error: null,
      };

    case ACTION_TYPES.SET_COORDINATES:
      return {
        ...state,
        coordinates: {
          latitude: action.payload.latitude,
          longitude: action.payload.longitude,
        },
      };

    case ACTION_TYPES.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null };

    case ACTION_TYPES.CLEAR_LOCATION:
      return {
        ...state,
        taluka: "",
        district: "",
        state: "",
        coordinates: { latitude: null, longitude: null },
        error: null,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const LocationContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LocationProvider({ children }) {
  const [state, dispatch] = useReducer(
    locationReducer,
    null,
    buildInitialState,
  );

  // Persist location whenever it changes
  useEffect(() => {
    if (state.taluka && state.district && state.state) {
      storage.set(STORAGE_KEYS.LOCATION, {
        taluka: state.taluka,
        district: state.district,
        state: state.state,
      });
    } else {
      storage.remove(STORAGE_KEYS.LOCATION);
    }
  }, [state.taluka, state.district, state.state]);

  // --- Actions ---------------------------------------------------------------

  /**
   * Set the full location object (state + district + taluka + optional coordinates).
   *
   * @param {Object} location
   * @param {string} [location.state]
   * @param {string} [location.district]
   * @param {string} [location.taluka]
   * @param {Object} [location.coordinates]
   */
  const setLocation = useCallback((location) => {
    dispatch({ type: ACTION_TYPES.SET_LOCATION, payload: location });
  }, []);

  /**
   * Set GPS coordinates independently.
   */
  const setCoordinates = useCallback((latitude, longitude) => {
    dispatch({
      type: ACTION_TYPES.SET_COORDINATES,
      payload: { latitude, longitude },
    });
  }, []);

  /**
   * Request the user's current position using the Geolocation API.
   */
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      dispatch({
        type: ACTION_TYPES.SET_ERROR,
        payload: "Geolocation is not supported by this browser.",
      });
      return;
    }

    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        dispatch({
          type: ACTION_TYPES.SET_COORDINATES,
          payload: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
      },
      (err) => {
        const messages = {
          1: "Location permission was denied. Please allow location access.",
          2: "Unable to determine your location. Please try again.",
          3: "Location request timed out. Please try again.",
        };
        dispatch({
          type: ACTION_TYPES.SET_ERROR,
          payload: messages[err.code] || "Failed to detect location.",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  /**
   * Clear all location data.
   */
  const clearLocation = useCallback(() => {
    storage.remove(STORAGE_KEYS.LOCATION);
    dispatch({ type: ACTION_TYPES.CLEAR_LOCATION });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  const value = {
    ...state,
    setLocation,
    setCoordinates,
    detectLocation,
    clearLocation,
    clearError,
    hasLocation: Boolean(state.taluka && state.district && state.state),
    hasCoordinates:
      state.coordinates.latitude !== null &&
      state.coordinates.longitude !== null,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}
