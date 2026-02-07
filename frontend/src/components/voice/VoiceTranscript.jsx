/**
 * VoiceTranscript - Real-time voice transcript display.
 *
 * Renders as a floating card above the VoiceButton showing:
 *  - Recording indicator with live dot
 *  - Final and interim transcript text
 *  - Command recognition feedback (success / unrecognized)
 *  - Animated voice wave bars while listening
 */

import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import { INTENTS } from "@services/voiceService";
import { LANGUAGES } from "@utils/constants";

// ---------------------------------------------------------------------------
// Localized Labels
// ---------------------------------------------------------------------------

const LABELS = {
  listening: {
    [LANGUAGES.EN]: "Listening...",
    [LANGUAGES.HI]: "सुन रहे हैं...",
  },
  processing: {
    [LANGUAGES.EN]: "Processing...",
    [LANGUAGES.HI]: "प्रसंस्करण...",
  },
  noSpeech: {
    [LANGUAGES.EN]: "Say a command...",
    [LANGUAGES.HI]: "कमांड बोलें...",
  },
};

// ---------------------------------------------------------------------------
// Wave Bar Configuration
// ---------------------------------------------------------------------------

const WAVE_BAR_COUNT = 5;
const WAVE_HEIGHTS = [4, 16, 8, 20, 4];
const WAVE_DURATION = 1.2;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function VoiceTranscript({
  transcript,
  interimTranscript,
  isListening,
  commandResult,
  language,
  onClose,
}) {
  const hasContent = Boolean(transcript || interimTranscript);
  const isCommandRecognized =
    commandResult && commandResult.intent !== INTENTS.UNKNOWN;

  const lang = language || LANGUAGES.EN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="w-72 bg-white rounded-xl shadow-card-hover border border-neutral-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          {isListening && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger-500" />
            </span>
          )}
          <span className="text-xs font-medium text-neutral-600">
            {isListening
              ? LABELS.listening[lang] || LABELS.listening[LANGUAGES.EN]
              : commandResult
                ? LABELS.processing[lang] || LABELS.processing[LANGUAGES.EN]
                : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          aria-label="Close transcript"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Transcript content */}
      <div className="px-4 py-3 min-h-[3rem]">
        {!hasContent && isListening && (
          <p className="text-sm text-neutral-400 italic">
            {LABELS.noSpeech[lang] || LABELS.noSpeech[LANGUAGES.EN]}
          </p>
        )}

        {transcript && (
          <p className="text-sm text-neutral-800 font-medium">{transcript}</p>
        )}

        {interimTranscript && (
          <p className="text-sm text-neutral-400 italic mt-1">
            {interimTranscript}
          </p>
        )}
      </div>

      {/* Command result feedback */}
      {commandResult && (
        <div
          className={[
            "flex items-center gap-2 px-4 py-2.5 border-t text-sm",
            isCommandRecognized
              ? "bg-primary-50 border-primary-100 text-primary-800"
              : "bg-secondary-50 border-secondary-100 text-secondary-800",
          ].join(" ")}
        >
          {isCommandRecognized ? (
            <CheckCircleIcon className="h-4 w-4 shrink-0 text-primary-600" />
          ) : (
            <XCircleIcon className="h-4 w-4 shrink-0 text-secondary-600" />
          )}
          <span className="flex-1">{commandResult.response}</span>
          {isCommandRecognized && (
            <SpeakerWaveIcon className="h-4 w-4 shrink-0 text-primary-400" />
          )}
        </div>
      )}

      {/* Voice wave visualization */}
      {isListening && (
        <div className="flex items-end justify-center gap-0.5 px-4 py-2 border-t border-neutral-100">
          {Array.from({ length: WAVE_BAR_COUNT }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-primary-500"
              animate={{ height: WAVE_HEIGHTS }}
              transition={{
                duration: WAVE_DURATION,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

VoiceTranscript.propTypes = {
  transcript: PropTypes.string,
  interimTranscript: PropTypes.string,
  isListening: PropTypes.bool.isRequired,
  commandResult: PropTypes.shape({
    intent: PropTypes.string.isRequired,
    confidence: PropTypes.number.isRequired,
    route: PropTypes.string,
    response: PropTypes.string.isRequired,
  }),
  language: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default VoiceTranscript;
