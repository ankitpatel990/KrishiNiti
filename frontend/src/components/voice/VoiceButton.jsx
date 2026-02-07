/**
 * VoiceButton - Floating microphone button for voice interaction.
 *
 * Renders as a fixed FAB positioned above the mobile bottom navigation.
 * Orchestrates the voice interaction lifecycle:
 *  1. Click mic to start / stop quick listening (one-shot commands)
 *  2. Display real-time transcript while listening
 *  3. Parse final transcript into a command intent
 *  4. Execute navigation or show the help modal
 *  5. Speak the response via TTS
 *
 * Also provides:
 *  - Help button to open VoiceCommands modal
 *  - Chat button to open the full VoiceChat panel
 *  - First-time VoiceTutorial on initial interaction
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MicrophoneIcon } from "@heroicons/react/24/solid";
import {
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import useVoice from "@hooks/useVoice";
import useApp from "@hooks/useApp";
import {
  parseCommand,
  speak,
  cancelSpeech,
  checkCompatibility,
  requestMicrophonePermission,
  isTutorialShown,
  getVoiceSettings,
  INTENTS,
} from "@services/voiceService";
import VoiceTranscript from "./VoiceTranscript";
import VoiceCommands from "./VoiceCommands";
import VoiceChat from "./VoiceChat";
import VoiceTutorial from "./VoiceTutorial";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERMISSION_GRANTED = "granted";
const PERMISSION_DENIED = "denied";

/** Duration (ms) to keep the command result visible before auto-dismissing. */
const RESULT_DISPLAY_DURATION_MS = 4000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function VoiceButton({ className = "" }) {
  const navigate = useNavigate();
  const { language } = useApp();
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    clearError,
  } = useVoice();

  const [showTranscript, setShowTranscript] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [commandResult, setCommandResult] = useState(null);
  const [micPermission, setMicPermission] = useState(null);
  const [localError, setLocalError] = useState(null);

  const lastProcessedTranscript = useRef("");
  const compatibility = useRef(checkCompatibility());
  const hasInteracted = useRef(false);

  // ---------------------------------------------------------------------------
  // Process final transcript into a command (one-shot mode)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (showChat) return; // Chat handles its own transcript processing
    if (!transcript || transcript === lastProcessedTranscript.current) return;

    lastProcessedTranscript.current = transcript;

    const result = parseCommand(transcript, language);
    setCommandResult(result);

    if (result.intent !== INTENTS.UNKNOWN && result.confidence >= 0.5) {
      if (result.intent === INTENTS.SHOW_HELP) {
        setShowCommands(true);
      } else if (result.route) {
        navigate(result.route);
      }
    }

    const settings = getVoiceSettings();
    if (settings.autoSpeak) {
      speak(result.response, language, settings).catch(() => {
        // TTS failure is non-critical
      });
    }
  }, [transcript, language, navigate, showChat]);

  // ---------------------------------------------------------------------------
  // Show / hide transcript panel alongside listening state
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isListening && !showChat) {
      setShowTranscript(true);
      setCommandResult(null);
    }
  }, [isListening, showChat]);

  // ---------------------------------------------------------------------------
  // Auto-dismiss command result after a short delay
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!commandResult) return;

    const timer = setTimeout(() => {
      setCommandResult(null);
      setShowTranscript(false);
    }, RESULT_DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [commandResult]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const ensureMicPermission = useCallback(async () => {
    if (!compatibility.current.isFullySupported) {
      setLocalError(
        "Voice recognition is not supported in this browser. Please use Chrome or Edge.",
      );
      return false;
    }

    if (micPermission !== PERMISSION_GRANTED) {
      const state = await requestMicrophonePermission();
      setMicPermission(state);

      if (state === PERMISSION_DENIED) {
        setLocalError(
          "Microphone access was denied. Please allow microphone permissions in your browser settings.",
        );
        return false;
      }
    }

    return true;
  }, [micPermission]);

  const maybeShowTutorial = useCallback(() => {
    if (!hasInteracted.current && !isTutorialShown()) {
      hasInteracted.current = true;
      setShowTutorial(true);
      return true;
    }
    hasInteracted.current = true;
    return false;
  }, []);

  const handleToggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Show tutorial on first interaction
    if (maybeShowTutorial()) return;

    const permitted = await ensureMicPermission();
    if (!permitted) return;

    clearError();
    setLocalError(null);
    setCommandResult(null);
    lastProcessedTranscript.current = "";
    startListening();
  }, [
    isListening,
    maybeShowTutorial,
    ensureMicPermission,
    clearError,
    startListening,
    stopListening,
  ]);

  const handleOpenChat = useCallback(() => {
    // Show tutorial on first interaction
    if (maybeShowTutorial()) return;

    if (isListening) {
      stopListening();
    }
    setShowTranscript(false);
    cancelSpeech();
    setShowChat(true);
  }, [maybeShowTutorial, isListening, stopListening]);

  const handleCloseChat = useCallback(() => {
    setShowChat(false);
  }, []);

  const handleDismissError = useCallback(() => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  const handleCloseTranscript = useCallback(() => {
    setShowTranscript(false);
    if (isListening) {
      stopListening();
    }
    cancelSpeech();
  }, [isListening, stopListening]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!isSupported && !compatibility.current.speechRecognition) {
    return null;
  }

  const displayError = localError || voiceError;

  // When chat is open, only render the chat panel (hide FAB)
  if (showChat) {
    return (
      <>
        <VoiceChat
          isOpen={showChat}
          onClose={handleCloseChat}
          language={language}
        />
        <VoiceTutorial
          isOpen={showTutorial}
          onClose={handleCloseTutorial}
          language={language}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-3 ${className}`}
      >
        {/* Error notification */}
        <AnimatePresence>
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="flex items-start gap-2 max-w-xs bg-danger-50 border border-danger-200 text-danger-800 rounded-lg px-3 py-2 text-sm shadow-card"
            >
              <ExclamationTriangleIcon
                className="h-5 w-5 shrink-0 text-danger-500 mt-0.5"
                aria-hidden="true"
              />
              <span className="flex-1">{displayError}</span>
              <button
                type="button"
                onClick={handleDismissError}
                className="shrink-0 p-0.5 rounded hover:bg-danger-100 transition-colors"
                aria-label="Dismiss error"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcript panel (one-shot mode) */}
        <AnimatePresence>
          {showTranscript && (
            <VoiceTranscript
              transcript={transcript}
              interimTranscript={interimTranscript}
              isListening={isListening}
              commandResult={commandResult}
              language={language}
              onClose={handleCloseTranscript}
            />
          )}
        </AnimatePresence>

        {/* Button cluster */}
        <div className="flex items-center gap-2">
          {/* Help button */}
          <motion.button
            type="button"
            onClick={() => setShowCommands(true)}
            className={[
              "h-10 w-10 rounded-full bg-white border border-neutral-200",
              "text-neutral-500 shadow-card flex items-center justify-center",
              "hover:bg-neutral-50 hover:text-neutral-700 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary-500",
            ].join(" ")}
            aria-label="Show voice commands"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </motion.button>

          {/* Chat button */}
          <motion.button
            type="button"
            onClick={handleOpenChat}
            className={[
              "h-10 w-10 rounded-full bg-white border border-neutral-200",
              "text-neutral-500 shadow-card flex items-center justify-center",
              "hover:bg-neutral-50 hover:text-neutral-700 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary-500",
            ].join(" ")}
            aria-label="Open voice chat"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </motion.button>

          {/* Microphone FAB */}
          <div className="relative">
            {/* Pulse rings animation */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary-400"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary-400"
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.5,
                    }}
                  />
                </>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={handleToggleListening}
              className={[
                "relative z-10 h-14 w-14 rounded-full shadow-lg",
                "flex items-center justify-center",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
                isListening
                  ? "bg-danger-600 text-white hover:bg-danger-700"
                  : "bg-primary-600 text-white hover:bg-primary-700",
              ].join(" ")}
              aria-label={
                isListening ? "Stop listening" : "Start voice command"
              }
              aria-pressed={isListening}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Voice commands help modal */}
      <VoiceCommands
        isOpen={showCommands}
        onClose={() => setShowCommands(false)}
        language={language}
      />

      {/* First-time tutorial */}
      <VoiceTutorial
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
        language={language}
      />
    </>
  );
}

VoiceButton.propTypes = {
  className: PropTypes.string,
};

export default VoiceButton;
