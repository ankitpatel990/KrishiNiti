/**
 * useVoice - Custom hook for consuming VoiceContext.
 *
 * Provides access to voice recognition state and actions:
 *  - isSupported, isListening, transcript, interimTranscript
 *  - commandHistory, error, settings
 *  - startListening, stopListening, clearHistory
 *  - clearError, updateSettings
 */

import { useContext } from "react";
import { VoiceContext } from "@context/VoiceContext";

/**
 * @returns {Object} VoiceContext value.
 * @throws {Error} If used outside of a VoiceProvider.
 */
export default function useVoice() {
  const context = useContext(VoiceContext);

  if (context === null) {
    throw new Error("useVoice must be used within a <VoiceProvider>.");
  }

  return context;
}
