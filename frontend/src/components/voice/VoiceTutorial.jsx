/**
 * VoiceTutorial - First-time user onboarding for the voice assistant.
 *
 * Presents a multi-step tutorial with:
 *  - Welcome and overview of voice capabilities
 *  - Interactive sample commands to try
 *  - Tips on language support and advanced features
 *  - Remembers completion state via localStorage
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MicrophoneIcon,
  ChatBubbleLeftRightIcon,
  LanguageIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import PropTypes from "prop-types";
import { markTutorialShown } from "@services/voiceService";
import { LANGUAGES } from "@utils/constants";

// ---------------------------------------------------------------------------
// Tutorial Steps
// ---------------------------------------------------------------------------

const STEPS = [
  {
    icon: MicrophoneIcon,
    title: {
      [LANGUAGES.EN]: "Voice Commands",
      [LANGUAGES.HI]: "वॉयस कमांड",
    },
    description: {
      [LANGUAGES.EN]:
        "Tap the microphone button and speak a command. FarmHelp will recognize your voice and navigate to the right page.",
      [LANGUAGES.HI]:
        "माइक्रोफ़ोन बटन दबाएं और कमांड बोलें। FarmHelp आपकी आवाज़ पहचानकर सही पेज पर ले जाएगा।",
    },
    tryCommands: {
      [LANGUAGES.EN]: ["weather", "show prices", "detect disease"],
      [LANGUAGES.HI]: ["मौसम बताओ", "भाव बताओ", "रोग पहचानो"],
    },
    color: "primary",
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: {
      [LANGUAGES.EN]: "Smart Conversations",
      [LANGUAGES.HI]: "स्मार्ट बातचीत",
    },
    description: {
      [LANGUAGES.EN]:
        "Open the chat panel for multi-turn conversations. Ask about specific crops, locations, or diseases and the assistant will remember context.",
      [LANGUAGES.HI]:
        "चैट पैनल खोलें बहु-चरण बातचीत के लिए। विशिष्ट फसलों, स्थानों या रोगों के बारे में पूछें और सहायक संदर्भ याद रखेगा।",
    },
    tryCommands: {
      [LANGUAGES.EN]: [
        "show wheat prices",
        "weather tomorrow",
        "how to treat paddy blast",
      ],
      [LANGUAGES.HI]: [
        "गेहूं का भाव",
        "कल का मौसम",
        "धान ब्लास्ट का इलाज",
      ],
    },
    color: "accent",
  },
  {
    icon: LanguageIcon,
    title: {
      [LANGUAGES.EN]: "Hindi and English",
      [LANGUAGES.HI]: "हिंदी और अंग्रेजी",
    },
    description: {
      [LANGUAGES.EN]:
        "Speak in English or Hindi. The assistant understands both languages and will respond in your preferred language.",
      [LANGUAGES.HI]:
        "अंग्रेजी या हिंदी में बोलें। सहायक दोनों भाषाएं समझता है और आपकी पसंदीदा भाषा में जवाब देगा।",
    },
    tryCommands: {
      [LANGUAGES.EN]: ["help", "मदद"],
      [LANGUAGES.HI]: ["help", "मदद"],
    },
    color: "secondary",
  },
  {
    icon: SparklesIcon,
    title: {
      [LANGUAGES.EN]: "Customize Settings",
      [LANGUAGES.HI]: "सेटिंग्स बदलें",
    },
    description: {
      [LANGUAGES.EN]:
        "In the chat panel, tap the gear icon to adjust speech rate, voice preference, and auto-speak settings.",
      [LANGUAGES.HI]:
        "चैट पैनल में, गियर आइकन दबाकर बोलने की गति, आवाज़ की पसंद और स्वतः बोलने की सेटिंग्स बदलें।",
    },
    tryCommands: null,
    color: "primary",
  },
];

const COLOR_MAP = {
  primary: {
    bg: "bg-primary-50",
    icon: "text-primary-600 bg-primary-100",
    badge: "bg-primary-100 text-primary-700",
    dot: "bg-primary-600",
    button: "bg-primary-600 hover:bg-primary-700",
  },
  accent: {
    bg: "bg-accent-50",
    icon: "text-accent-600 bg-accent-100",
    badge: "bg-accent-100 text-accent-700",
    dot: "bg-accent-600",
    button: "bg-accent-600 hover:bg-accent-700",
  },
  secondary: {
    bg: "bg-secondary-50",
    icon: "text-secondary-600 bg-secondary-100",
    badge: "bg-secondary-100 text-secondary-700",
    dot: "bg-secondary-600",
    button: "bg-secondary-600 hover:bg-secondary-700",
  },
};

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------

const STEP_VARIANTS = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function VoiceTutorial({ isOpen, onClose, language }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const lang = language || LANGUAGES.EN;

  const totalSteps = STEPS.length;
  const step = STEPS[currentStep];
  const colors = COLOR_MAP[step.color] || COLOR_MAP.primary;
  const IconComponent = step.icon;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      markTutorialShown();
      onClose();
      return;
    }
    setDirection(1);
    setCurrentStep((prev) => prev + 1);
  }, [isLastStep, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    markTutorialShown();
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          aria-label="Skip tutorial"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Step content */}
        <div className="px-6 pt-8 pb-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={STEP_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center ${colors.icon}`}
                >
                  <IconComponent className="h-7 w-7" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-center text-neutral-900 mb-2">
                {step.title[lang] || step.title[LANGUAGES.EN]}
              </h3>

              {/* Description */}
              <p className="text-sm text-neutral-600 text-center leading-relaxed mb-4">
                {step.description[lang] || step.description[LANGUAGES.EN]}
              </p>

              {/* Try commands */}
              {step.tryCommands && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-500 text-center">
                    {lang === LANGUAGES.HI ? "यह बोलकर देखें:" : "Try saying:"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {(step.tryCommands[lang] || step.tryCommands[LANGUAGES.EN]).map(
                      (cmd) => (
                        <span
                          key={cmd}
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colors.badge}`}
                        >
                          &ldquo;{cmd}&rdquo;
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={[
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentStep
                  ? `w-6 ${colors.dot}`
                  : "w-1.5 bg-neutral-200",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={[
              "flex items-center gap-1 text-sm font-medium transition-colors",
              currentStep === 0
                ? "text-neutral-300 cursor-not-allowed"
                : "text-neutral-600 hover:text-neutral-800",
            ].join(" ")}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            {lang === LANGUAGES.HI ? "पीछे" : "Back"}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white ${colors.button} transition-colors`}
          >
            {isLastStep
              ? (lang === LANGUAGES.HI ? "शुरू करें" : "Get Started")
              : (lang === LANGUAGES.HI ? "आगे" : "Next")}
            {!isLastStep && <ChevronRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

VoiceTutorial.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  language: PropTypes.string,
};

export default VoiceTutorial;
