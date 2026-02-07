/* eslint-disable react-refresh/only-export-components */
/**
 * AuthContext - Authentication state management.
 *
 * Manages:
 *  - User authentication state
 *  - Login/Logout operations
 *  - Token persistence
 *  - Current user data
 */

import { createContext, useReducer, useEffect, useCallback, useContext } from "react";
import PropTypes from "prop-types";
import storage from "@utils/storage";
import { STORAGE_KEYS } from "@utils/constants";

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

function loadPersistedAuth() {
  const user = storage.get(STORAGE_KEYS.AUTH_USER, null);
  const token = storage.get(STORAGE_KEYS.AUTH_TOKEN, null);
  return {
    user,
    token,
    isAuthenticated: Boolean(user && token),
  };
}

function buildInitialState() {
  const persisted = loadPersistedAuth();
  return {
    ...persisted,
    loading: false,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

const ACTION_TYPES = {
  SET_LOADING: "SET_LOADING",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGOUT: "LOGOUT",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  UPDATE_USER: "UPDATE_USER",
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function authReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload, error: null };

    case ACTION_TYPES.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case ACTION_TYPES.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null };

    case ACTION_TYPES.UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, null, buildInitialState);

  // Persist auth data whenever it changes
  useEffect(() => {
    if (state.user && state.token) {
      storage.set(STORAGE_KEYS.AUTH_USER, state.user);
      storage.set(STORAGE_KEYS.AUTH_TOKEN, state.token);
    } else {
      storage.remove(STORAGE_KEYS.AUTH_USER);
      storage.remove(STORAGE_KEYS.AUTH_TOKEN);
    }
  }, [state.user, state.token]);

  // --- Actions ---------------------------------------------------------------

  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
  }, []);

  const loginSuccess = useCallback((user, token) => {
    dispatch({
      type: ACTION_TYPES.LOGIN_SUCCESS,
      payload: { user, token },
    });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: ACTION_TYPES.LOGOUT });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  const updateUser = useCallback((userData) => {
    dispatch({ type: ACTION_TYPES.UPDATE_USER, payload: userData });
  }, []);

  const value = {
    ...state,
    setLoading,
    loginSuccess,
    logout,
    setError,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
