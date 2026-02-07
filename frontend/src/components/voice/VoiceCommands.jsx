/**
 * VoiceCommands - Help modal displaying available voice commands.
 *
 * Presents categorized voice commands (basic + advanced) with
 * example phrases in both English and Hindi. Each command category
 * is color-coded and accompanied by a relevant icon.
 */

import PropTypes from "prop-types";
import {
  CloudIcon,
  CameraIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  BeakerIcon,
  ArrowsRightLeftIcon,
  BellAlertIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "@components/common";
import { AVAILABLE_COMMANDS, ADVANCED_COMMANDS } from "@services/voiceService";
import { LANGUAGES } from "@utils/constants";

// ---------------------------------------------------------------------------
// Icon and Color Mapping
// ---------------------------------------------------------------------------

const INTENT_ICONS = {
  navigate_weather: CloudIcon,
  navigate_disease: CameraIcon,
  navigate_mandi: CurrencyRupeeIcon,
  navigate_home: HomeIcon,
  show_help: QuestionMarkCircleIcon,
  query_crop_price: MagnifyingGlassIcon,
  query_weather_time: ClockIcon,
  query_disease_treatment: BeakerIcon,
  compare_prices: ArrowsRightLeftIcon,
  read_alerts: BellAlertIcon,
  best_mandi: StarIcon,
};

const INTENT_COLORS = {
  navigate_weather: "bg-accent-50 text-accent-700 border-accent-200",
  navigate_disease: "bg-danger-50 text-danger-700 border-danger-200",
  navigate_mandi: "bg-secondary-50 text-secondary-700 border-secondary-200",
  navigate_home: "bg-primary-50 text-primary-700 border-primary-200",
  show_help: "bg-neutral-50 text-neutral-700 border-neutral-200",
  query_crop_price: "bg-secondary-50 text-secondary-700 border-secondary-200",
  query_weather_time: "bg-accent-50 text-accent-700 border-accent-200",
  query_disease_treatment: "bg-danger-50 text-danger-700 border-danger-200",
  compare_prices: "bg-secondary-50 text-secondary-700 border-secondary-200",
  read_alerts: "bg-accent-50 text-accent-700 border-accent-200",
  best_mandi: "bg-primary-50 text-primary-700 border-primary-200",
};

// ---------------------------------------------------------------------------
// Localized Labels
// ---------------------------------------------------------------------------

const MODAL_LABELS = {
  title: {
    [LANGUAGES.EN]: "Voice Commands",
    [LANGUAGES.HI]: "वॉयस कमांड",
  },
  description: {
    [LANGUAGES.EN]:
      "Say any of these commands after pressing the microphone button.",
    [LANGUAGES.HI]:
      "माइक्रोफ़ोन बटन दबाने के बाद इनमें से कोई भी कमांड बोलें।",
  },
  basicSection: {
    [LANGUAGES.EN]: "Basic Commands",
    [LANGUAGES.HI]: "बुनियादी कमांड",
  },
  advancedSection: {
    [LANGUAGES.EN]: "Advanced Commands",
    [LANGUAGES.HI]: "उन्नत कमांड",
  },
  tip: {
    [LANGUAGES.EN]: "You can speak in English or Hindi. Open the chat panel for multi-turn conversations.",
    [LANGUAGES.HI]: "आप अंग्रेजी या हिंदी में बोल सकते हैं। बहु-चरण बातचीत के लिए चैट पैनल खोलें।",
  },
};

// ---------------------------------------------------------------------------
// Shared renderer
// ---------------------------------------------------------------------------

function CommandList({ commands, language }) {
  const lang = language || LANGUAGES.EN;

  return (
    <div className="space-y-2.5">
      {commands.map((cmd) => {
        const IconComponent =
          INTENT_ICONS[cmd.intent] || QuestionMarkCircleIcon;
        const colorClasses =
          INTENT_COLORS[cmd.intent] || INTENT_COLORS.show_help;
        const label = cmd.label[lang] || cmd.label[LANGUAGES.EN];
        const examples = cmd.examples[lang] || cmd.examples[LANGUAGES.EN];

        return (
          <div
            key={cmd.intent}
            className={`rounded-lg border p-3 ${colorClasses}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <IconComponent
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span className="font-medium text-sm">{label}</span>
              {cmd.offline && (
                <span className="ml-auto text-[10px] font-medium opacity-60">
                  offline
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {examples.map((example) => (
                <span
                  key={example}
                  className="inline-block px-2 py-0.5 bg-white/60 rounded text-xs font-mono"
                >
                  &ldquo;{example}&rdquo;
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

CommandList.propTypes = {
  commands: PropTypes.arrayOf(
    PropTypes.shape({
      intent: PropTypes.string.isRequired,
      label: PropTypes.object.isRequired,
      examples: PropTypes.object.isRequired,
      offline: PropTypes.bool,
    }),
  ).isRequired,
  language: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function VoiceCommands({ isOpen, onClose, language }) {
  const lang = language || LANGUAGES.EN;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={MODAL_LABELS.title[lang] || MODAL_LABELS.title[LANGUAGES.EN]}
      size="lg"
    >
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {/* Description */}
        <p className="text-sm text-neutral-600">
          {MODAL_LABELS.description[lang] ||
            MODAL_LABELS.description[LANGUAGES.EN]}
        </p>

        {/* Basic commands */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            {MODAL_LABELS.basicSection[lang] ||
              MODAL_LABELS.basicSection[LANGUAGES.EN]}
          </h4>
          <CommandList commands={AVAILABLE_COMMANDS} language={lang} />
        </div>

        {/* Advanced commands */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            {MODAL_LABELS.advancedSection[lang] ||
              MODAL_LABELS.advancedSection[LANGUAGES.EN]}
          </h4>
          <CommandList commands={ADVANCED_COMMANDS} language={lang} />
        </div>

        {/* Tip */}
        <p className="text-xs text-neutral-500 text-center pt-2 border-t border-neutral-100">
          {MODAL_LABELS.tip[lang] || MODAL_LABELS.tip[LANGUAGES.EN]}
        </p>
      </div>
    </Modal>
  );
}

VoiceCommands.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  language: PropTypes.string,
};

export default VoiceCommands;
