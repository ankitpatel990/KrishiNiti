/* eslint-disable react-refresh/only-export-components */
/**
 * VoiceContext - Voice recognition state management.
 *
 * Manages:
 *  - Web Speech API integration (SpeechRecognition)
 *  - Listening state and current transcript
 *  - Command history
 *  - Voice settings (language, continuous mode)
 *
 * Gracefully degrades when the Web Speech API is unavailable.
 */

import {
  createContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { LANGUAGES, FEATURES } from "@utils/constants";

// ---------------------------------------------------------------------------
// Browser Feature Detection
// ---------------------------------------------------------------------------

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const SPEECH_API_AVAILABLE =
  Boolean(SpeechRecognitionAPI) && FEATURES.VOICE_ENABLED;

// Language code mapping for Web Speech API
const VOICE_LANG_MAP = {
  [LANGUAGES.EN]: "en-IN",
  [LANGUAGES.HI]: "hi-IN",
};

// ---------------------------------------------------------------------------
// Helpers (pure, declared before any usage)
// ---------------------------------------------------------------------------

const SPEECH_ERROR_MAP = {
  "not-allowed":
    "Microphone access was denied. Please allow microphone permissions.",
  "no-speech": "No speech was detected. Please try again.",
  "audio-capture": "No microphone was found. Please check your device.",
  network: "A network error occurred during speech recognition.",
  aborted: "Speech recognition was aborted.",
  "service-not-allowed": "Speech recognition service is not allowed.",
};

function mapSpeechError(errorCode) {
  return (
    SPEECH_ERROR_MAP[errorCode] || `Speech recognition error: ${errorCode}`
  );
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const MAX_HISTORY_SIZE = 50;

const INITIAL_STATE = {
  isSupported: SPEECH_API_AVAILABLE,
  isListening: false,
  transcript: "",
  interimTranscript: "",
  commandHistory: [],
  error: null,
  settings: {
    language: LANGUAGES.EN,
    continuous: false,
    interimResults: true,
  },
};

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

const ACTION_TYPES = {
  START_LISTENING: "START_LISTENING",
  STOP_LISTENING: "STOP_LISTENING",
  SET_TRANSCRIPT: "SET_TRANSCRIPT",
  SET_INTERIM: "SET_INTERIM",
  ADD_TO_HISTORY: "ADD_TO_HISTORY",
  CLEAR_HISTORY: "CLEAR_HISTORY",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  RESET: "RESET",
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function voiceReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.START_LISTENING:
      return {
        ...state,
        isListening: true,
        transcript: "",
        interimTranscript: "",
        error: null,
      };

    case ACTION_TYPES.STOP_LISTENING:
      return { ...state, isListening: false, interimTranscript: "" };

    case ACTION_TYPES.SET_TRANSCRIPT:
      return { ...state, transcript: action.payload };

    case ACTION_TYPES.SET_INTERIM:
      return { ...state, interimTranscript: action.payload };

    case ACTION_TYPES.ADD_TO_HISTORY: {
      const entry = {
        text: action.payload,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [entry, ...state.commandHistory].slice(
        0,
        MAX_HISTORY_SIZE,
      );
      return { ...state, commandHistory: updatedHistory };
    }

    case ACTION_TYPES.CLEAR_HISTORY:
      return { ...state, commandHistory: [] };

    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, isListening: false };

    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null };

    case ACTION_TYPES.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case ACTION_TYPES.RESET:
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const VoiceContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function VoiceProvider({ children }) {
  const [state, dispatch] = useReducer(voiceReducer, INITIAL_STATE);
  const recognitionRef = useRef(null);

  // Create / re-create the SpeechRecognition instance when settings change
  useEffect(() => {
    if (!SPEECH_API_AVAILABLE) {
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = VOICE_LANG_MAP[state.settings.language] || "en-IN";
    recognition.continuous = state.settings.continuous;
    recognition.interimResults = state.settings.interimResults;

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText) {
        dispatch({
          type: ACTION_TYPES.SET_TRANSCRIPT,
          payload: finalText.trim(),
        });
        dispatch({
          type: ACTION_TYPES.ADD_TO_HISTORY,
          payload: finalText.trim(),
        });
      }

      if (interim) {
        dispatch({ type: ACTION_TYPES.SET_INTERIM, payload: interim });
      }
    };

    recognition.onerror = (event) => {
      const message = mapSpeechError(event.error);
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: message });
    };

    recognition.onend = () => {
      dispatch({ type: ACTION_TYPES.STOP_LISTENING });
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Ignore abort errors during cleanup
      }
    };
  }, [
    state.settings.language,
    state.settings.continuous,
    state.settings.interimResults,
  ]);

  // --- Actions ---------------------------------------------------------------

  const startListening = useCallback(() => {
    if (!SPEECH_API_AVAILABLE) {
      dispatch({
        type: ACTION_TYPES.SET_ERROR,
        payload: "Voice recognition is not supported in this browser.",
      });
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    try {
      recognition.start();
      dispatch({ type: ACTION_TYPES.START_LISTENING });
    } catch {
      // Already started -- restart
      try {
        recognition.stop();
        setTimeout(() => {
          recognition.start();
          dispatch({ type: ACTION_TYPES.START_LISTENING });
        }, 100);
      } catch {
        dispatch({
          type: ACTION_TYPES.SET_ERROR,
          payload: "Failed to start voice recognition.",
        });
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    }
    dispatch({ type: ACTION_TYPES.STOP_LISTENING });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_HISTORY });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    dispatch({ type: ACTION_TYPES.UPDATE_SETTINGS, payload: newSettings });
  }, []);

  const value = {
    ...state,
    startListening,
    stopListening,
    clearHistory,
    clearError,
    updateSettings,
  };

  return (
    <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
  );
}
