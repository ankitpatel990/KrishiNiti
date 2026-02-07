/**
 * VoiceChat - Chat-style interface for voice interactions.
 *
 * Provides a full conversational UI with:
 *  - Scrollable message history (user bubbles + assistant bubbles)
 *  - Dual input mode: text field and microphone toggle
 *  - Embedded voice settings panel (speech rate, gender, auto-speak)
 *  - Clear history action
 *  - Context-aware multi-turn conversations via ConversationEngine
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  TrashIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import { MicrophoneIcon as MicrophoneIconSolid } from "@heroicons/react/24/solid";
import PropTypes from "prop-types";
import useVoice from "@hooks/useVoice";
import {
  ConversationEngine,
  speak,
  cancelSpeech,
  getVoiceSettings,
  saveVoiceSettings,
  ACTIONS,
} from "@services/voiceService";
import { LANGUAGES } from "@utils/constants";

// ---------------------------------------------------------------------------
// Localized Labels
// ---------------------------------------------------------------------------

const LABELS = {
  title: {
    [LANGUAGES.EN]: "Voice Assistant",
    [LANGUAGES.HI]: "वॉयस सहायक",
  },
  placeholder: {
    [LANGUAGES.EN]: "Type a command or question...",
    [LANGUAGES.HI]: "कमांड या सवाल टाइप करें...",
  },
  clearHistory: {
    [LANGUAGES.EN]: "Clear chat",
    [LANGUAGES.HI]: "चैट साफ़ करें",
  },
  settings: {
    [LANGUAGES.EN]: "Settings",
    [LANGUAGES.HI]: "सेटिंग्स",
  },
  speechRate: {
    [LANGUAGES.EN]: "Speech Rate",
    [LANGUAGES.HI]: "बोलने की गति",
  },
  voiceGender: {
    [LANGUAGES.EN]: "Voice",
    [LANGUAGES.HI]: "आवाज़",
  },
  male: {
    [LANGUAGES.EN]: "Male",
    [LANGUAGES.HI]: "पुरुष",
  },
  female: {
    [LANGUAGES.EN]: "Female",
    [LANGUAGES.HI]: "महिला",
  },
  autoSpeak: {
    [LANGUAGES.EN]: "Auto-speak responses",
    [LANGUAGES.HI]: "जवाब स्वतः बोलें",
  },
  empty: {
    [LANGUAGES.EN]: "Start a conversation by typing or speaking a command.",
    [LANGUAGES.HI]: "कमांड टाइप या बोलकर बातचीत शुरू करें।",
  },
  listening: {
    [LANGUAGES.EN]: "Listening...",
    [LANGUAGES.HI]: "सुन रहे हैं...",
  },
};

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const PANEL_VARIANTS = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const MESSAGE_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.15 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary-600 text-white rounded-br-md"
            : "bg-neutral-100 text-neutral-800 rounded-bl-md",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {message.entities &&
          message.entities.crops &&
          message.entities.crops.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.entities.crops.map((crop) => (
                <span
                  key={crop}
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    isUser
                      ? "bg-primary-500 text-primary-100"
                      : "bg-primary-100 text-primary-700"
                  }`}
                >
                  {crop}
                </span>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    entities: PropTypes.object,
  }).isRequired,
};

// ---------------------------------------------------------------------------
// Settings Panel
// ---------------------------------------------------------------------------

function SettingsPanel({ settings, onChange, language }) {
  const lang = language || LANGUAGES.EN;

  const handleRateChange = (e) => {
    onChange({ speechRate: parseFloat(e.target.value) });
  };

  const handleGenderToggle = () => {
    onChange({
      voiceGender: settings.voiceGender === "male" ? "female" : "male",
    });
  };

  const handleAutoSpeakToggle = () => {
    onChange({ autoSpeak: !settings.autoSpeak });
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-t border-neutral-100"
    >
      <div className="px-4 py-3 space-y-3 bg-neutral-50">
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {LABELS.settings[lang]}
        </h4>

        {/* Speech Rate */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="voice-rate" className="text-xs text-neutral-600">
              {LABELS.speechRate[lang]}
            </label>
            <span className="text-xs font-mono text-neutral-500">
              {settings.speechRate.toFixed(1)}x
            </span>
          </div>
          <input
            id="voice-rate"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.speechRate}
            onChange={handleRateChange}
            className="w-full h-1.5 rounded-full appearance-none bg-neutral-200 accent-primary-600"
          />
        </div>

        {/* Voice Gender */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            {LABELS.voiceGender[lang]}
          </span>
          <button
            type="button"
            onClick={handleGenderToggle}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-neutral-200 hover:bg-neutral-100 transition-colors"
          >
            {settings.voiceGender === "male"
              ? LABELS.male[lang]
              : LABELS.female[lang]}
          </button>
        </div>

        {/* Auto-Speak */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-600">
            {LABELS.autoSpeak[lang]}
          </span>
          <button
            type="button"
            onClick={handleAutoSpeakToggle}
            className={[
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              settings.autoSpeak ? "bg-primary-600" : "bg-neutral-300",
            ].join(" ")}
            role="switch"
            aria-checked={settings.autoSpeak}
          >
            <span
              className={[
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                settings.autoSpeak ? "translate-x-[18px]" : "translate-x-[2px]",
              ].join(" ")}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

SettingsPanel.propTypes = {
  settings: PropTypes.shape({
    speechRate: PropTypes.number.isRequired,
    voiceGender: PropTypes.string.isRequired,
    autoSpeak: PropTypes.bool.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  language: PropTypes.string.isRequired,
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function VoiceChat({ isOpen, onClose, language }) {
  const navigate = useNavigate();
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
  } = useVoice();

  const lang = language || LANGUAGES.EN;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const engine = useMemo(() => new ConversationEngine(lang), []);
  const [messages, setMessages] = useState(() => engine.getMessages());
  const [textInput, setTextInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState(getVoiceSettings);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastProcessedTranscript = useRef("");

  // Sync engine language
  useEffect(() => {
    engine.setLanguage(lang);
  }, [lang, engine]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Process voice transcript when it changes
  useEffect(() => {
    if (!transcript || transcript === lastProcessedTranscript.current) {
      return;
    }

    lastProcessedTranscript.current = transcript;
    handleProcessInput(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  // ---------------------------------------------------------------------------
  // Core message processing
  // ---------------------------------------------------------------------------

  const handleProcessInput = useCallback(
    (text) => {
      if (!text || !text.trim()) return;

      const result = engine.process(text, lang);
      setMessages(engine.getMessages());

      if (result.action === ACTIONS.NAVIGATE && result.route) {
        navigate(result.route);
      }

      if (voiceSettings.autoSpeak && result.response) {
        speak(result.response, lang, voiceSettings).catch(() => {
          // Non-critical
        });
      }
    },
    [engine, lang, navigate, voiceSettings],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSendText = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    setTextInput("");
    handleProcessInput(trimmed);
  }, [textInput, handleProcessInput]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText],
  );

  const handleToggleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      lastProcessedTranscript.current = "";
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleClearHistory = useCallback(() => {
    engine.clear();
    setMessages([]);
    cancelSpeech();
  }, [engine]);

  const handleSettingsChange = useCallback((updates) => {
    const merged = saveVoiceSettings(updates);
    setVoiceSettings(merged);
  }, []);

  const handleClose = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    cancelSpeech();
    onClose();
  }, [isListening, stopListening, onClose]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={PANEL_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={[
            "fixed z-50 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden",
            "flex flex-col",
            "bottom-4 right-4 w-[360px] max-h-[min(600px,80vh)]",
            "max-sm:inset-x-2 max-sm:bottom-2 max-sm:w-auto max-sm:max-h-[85vh]",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-primary-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              {voiceSettings.autoSpeak ? (
                <SpeakerWaveIcon className="h-5 w-5" />
              ) : (
                <SpeakerXMarkIcon className="h-5 w-5" />
              )}
              <h3 className="font-semibold text-sm">{LABELS.title[lang]}</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg hover:bg-primary-500 transition-colors"
                aria-label={LABELS.clearHistory[lang]}
                title={LABELS.clearHistory[lang]}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowSettings((prev) => !prev)}
                className={[
                  "p-1.5 rounded-lg transition-colors",
                  showSettings ? "bg-primary-500" : "hover:bg-primary-500",
                ].join(" ")}
                aria-label={LABELS.settings[lang]}
                title={LABELS.settings[lang]}
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-primary-500 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Settings panel (collapsible) */}
          <AnimatePresence>
            {showSettings && (
              <SettingsPanel
                settings={voiceSettings}
                onChange={handleSettingsChange}
                language={lang}
              />
            )}
          </AnimatePresence>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full min-h-[120px]">
                <p className="text-sm text-neutral-400 text-center px-4">
                  {LABELS.empty[lang]}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Interim transcript while listening */}
            {isListening && interimTranscript && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 bg-primary-100 text-primary-700 text-sm italic">
                  {interimTranscript}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-danger-50 border-t border-danger-100 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500" />
              </span>
              <span className="text-xs font-medium text-danger-700">
                {LABELS.listening[lang]}
              </span>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-neutral-100 bg-white shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={LABELS.placeholder[lang]}
              className="flex-1 rounded-full border border-neutral-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isListening}
            />

            {/* Mic toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={[
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary-500",
                isListening
                  ? "bg-danger-600 text-white hover:bg-danger-700"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              ].join(" ")}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              aria-pressed={isListening}
            >
              {isListening ? (
                <MicrophoneIconSolid className="h-4 w-4" />
              ) : (
                <MicrophoneIcon className="h-4 w-4" />
              )}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSendText}
              disabled={!textInput.trim() || isListening}
              className={[
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary-500",
                textInput.trim() && !isListening
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-neutral-100 text-neutral-300 cursor-not-allowed",
              ].join(" ")}
              aria-label="Send message"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

VoiceChat.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  language: PropTypes.string,
};

export default VoiceChat;
