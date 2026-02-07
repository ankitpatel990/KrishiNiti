/* eslint-disable react-refresh/only-export-components */
/**
 * AppContext - Global application state.
 *
 * Manages:
 *  - Language preference (English / Hindi) with persistence
 *  - Theme preference (light / dark) with persistence
 *  - User preferences (notifications, etc.)
 *  - Global loading state
 *  - Global error state
 */

import { createContext, useReducer, useEffect, useCallback } from "react";
import storage from "@utils/storage";
import {
  STORAGE_KEYS,
  LANGUAGES,
  DEFAULT_LANGUAGE,
} from "@utils/constants";

// ---------------------------------------------------------------------------
// Theme Constants
// ---------------------------------------------------------------------------

export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

function loadPersistedPreferences() {
  return storage.get(STORAGE_KEYS.USER_PREFERENCES, {
    notifications: true,
  });
}

function loadPersistedTheme() {
  const saved = storage.get(STORAGE_KEYS.THEME, null);
  if (saved === THEMES.DARK || saved === THEMES.LIGHT) {
    return saved;
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return THEMES.DARK;
  }
  return THEMES.LIGHT;
}

function buildInitialState() {
  return {
    language: storage.get(STORAGE_KEYS.LANGUAGE, DEFAULT_LANGUAGE),
    theme: loadPersistedTheme(),
    preferences: loadPersistedPreferences(),
    loading: false,
    loadingMessage: "",
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

const ACTION_TYPES = {
  SET_LANGUAGE: "SET_LANGUAGE",
  SET_THEME: "SET_THEME",
  SET_PREFERENCES: "SET_PREFERENCES",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  RESET: "RESET",
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function appReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LANGUAGE:
      return { ...state, language: action.payload };

    case ACTION_TYPES.SET_THEME:
      return { ...state, theme: action.payload };

    case ACTION_TYPES.SET_PREFERENCES:
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };

    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading,
        loadingMessage: action.payload.message || "",
      };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null };

    case ACTION_TYPES.RESET:
      return buildInitialState();

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AppContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, buildInitialState);

  // Persist language whenever it changes
  useEffect(() => {
    storage.set(STORAGE_KEYS.LANGUAGE, state.language);
    document.documentElement.lang = state.language;
  }, [state.language]);

  // Persist theme and apply dark class to <html>
  useEffect(() => {
    storage.set(STORAGE_KEYS.THEME, state.theme);
    if (state.theme === THEMES.DARK) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [state.theme]);

  // Persist preferences whenever they change
  useEffect(() => {
    storage.set(STORAGE_KEYS.USER_PREFERENCES, state.preferences);
  }, [state.preferences]);

  // --- Actions ---------------------------------------------------------------

  const setLanguage = useCallback((lang) => {
    const validLangs = Object.values(LANGUAGES);
    if (!validLangs.includes(lang)) {
      console.error(
        `[AppContext] Invalid language "${lang}". Expected one of: ${validLangs.join(", ")}`,
      );
      return;
    }
    dispatch({ type: ACTION_TYPES.SET_LANGUAGE, payload: lang });
  }, []);

  const actions = {
    setLanguage,

    toggleLanguage: () => {
      const nextLang =
        state.language === LANGUAGES.EN ? LANGUAGES.HI : LANGUAGES.EN;
      dispatch({ type: ACTION_TYPES.SET_LANGUAGE, payload: nextLang });
    },

    setTheme: (theme) => {
      if (theme !== THEMES.LIGHT && theme !== THEMES.DARK) {
        return;
      }
      dispatch({ type: ACTION_TYPES.SET_THEME, payload: theme });
    },

    toggleTheme: () => {
      const nextTheme =
        state.theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      dispatch({ type: ACTION_TYPES.SET_THEME, payload: nextTheme });
    },

    setPreferences: (prefs) => {
      dispatch({ type: ACTION_TYPES.SET_PREFERENCES, payload: prefs });
    },

    setLoading: (loading, message = "") => {
      dispatch({
        type: ACTION_TYPES.SET_LOADING,
        payload: { loading, message },
      });
    },

    setError: (error) => {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error });
    },

    clearError: () => {
      dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
    },

    resetState: () => {
      storage.remove(STORAGE_KEYS.LANGUAGE);
      storage.remove(STORAGE_KEYS.THEME);
      storage.remove(STORAGE_KEYS.USER_PREFERENCES);
      dispatch({ type: ACTION_TYPES.RESET });
    },
  };

  const value = { ...state, ...actions };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
