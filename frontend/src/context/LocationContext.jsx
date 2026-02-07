/* eslint-disable react-refresh/only-export-components */
/**
 * LocationContext - User location state management.
 *
 * Manages:
 *  - User pincode with localStorage persistence
 *  - District and state derived from pincode
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
import { validatePincode } from "@utils/validators";

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

function buildInitialState() {
  const savedPincode = storage.get(STORAGE_KEYS.PINCODE, "");

  return {
    pincode: savedPincode,
    district: "",
    state: "",
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
  SET_PINCODE: "SET_PINCODE",
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
    case ACTION_TYPES.SET_PINCODE:
      return {
        ...state,
        pincode: action.payload,
        error: null,
      };

    case ACTION_TYPES.SET_LOCATION:
      return {
        ...state,
        pincode: action.payload.pincode || state.pincode,
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
        pincode: "",
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

  // Persist pincode whenever it changes
  useEffect(() => {
    if (state.pincode) {
      storage.set(STORAGE_KEYS.PINCODE, state.pincode);
    } else {
      storage.remove(STORAGE_KEYS.PINCODE);
    }
  }, [state.pincode]);

  // --- Actions ---------------------------------------------------------------

  /**
   * Set the user's pincode after validation.
   *
   * @param {string} pincode - 6-digit Indian pincode.
   */
  const setPincode = useCallback((pincode) => {
    const result = validatePincode(pincode);
    if (!result.valid) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: result.message });
      return;
    }
    dispatch({ type: ACTION_TYPES.SET_PINCODE, payload: pincode.trim() });
  }, []);

  /**
   * Set the full location object (pincode + district + state + coordinates).
   *
   * @param {Object} location
   * @param {string} [location.pincode]
   * @param {string} [location.district]
   * @param {string} [location.state]
   * @param {Object} [location.coordinates]
   * @param {number} [location.coordinates.latitude]
   * @param {number} [location.coordinates.longitude]
   */
  const setLocation = useCallback((location) => {
    dispatch({ type: ACTION_TYPES.SET_LOCATION, payload: location });
  }, []);

  /**
   * Set GPS coordinates independently.
   *
   * @param {number} latitude
   * @param {number} longitude
   */
  const setCoordinates = useCallback((latitude, longitude) => {
    dispatch({
      type: ACTION_TYPES.SET_COORDINATES,
      payload: { latitude, longitude },
    });
  }, []);

  /**
   * Request the user's current position using the Geolocation API.
   * Updates coordinates on success; dispatches an error on failure.
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
   * Clear all location data and remove persisted pincode.
   */
  const clearLocation = useCallback(() => {
    storage.remove(STORAGE_KEYS.PINCODE);
    dispatch({ type: ACTION_TYPES.CLEAR_LOCATION });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  const value = {
    ...state,
    setPincode,
    setLocation,
    setCoordinates,
    detectLocation,
    clearLocation,
    clearError,
    hasLocation: Boolean(state.pincode),
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
