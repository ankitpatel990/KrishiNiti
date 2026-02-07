/**
 * VoiceService - Voice command processing and text-to-speech.
 *
 * Provides:
 *  - Intent recognition from voice transcripts (Hindi + English)
 *  - Advanced intents with entity extraction (crops, locations, dates, diseases)
 *  - ConversationEngine for multi-turn, context-aware dialogues
 *  - Confidence scoring for matched commands
 *  - Voice settings management with localStorage persistence
 *  - Text-to-speech synthesis with configurable rate and voice
 *  - Browser compatibility checks
 *  - Microphone permission management
 *  - Offline support for all client-side command processing
 */

import { LANGUAGES, ROUTES, SUPPORTED_CROPS, STORAGE_KEYS } from "@utils/constants";
import storage from "@utils/storage";

// ---------------------------------------------------------------------------
// Intent Definitions
// ---------------------------------------------------------------------------

export const INTENTS = {
  // Basic navigation (from Prompt 17)
  NAVIGATE_HOME: "navigate_home",
  NAVIGATE_WEATHER: "navigate_weather",
  NAVIGATE_DISEASE: "navigate_disease",
  NAVIGATE_APMC: "navigate_apmc",
  SHOW_HELP: "show_help",

  // Advanced queries (Prompt 18)
  QUERY_CROP_PRICE: "query_crop_price",
  QUERY_WEATHER_TIME: "query_weather_time",
  QUERY_DISEASE_TREATMENT: "query_disease_treatment",
  COMPARE_PRICES: "compare_prices",
  READ_ALERTS: "read_alerts",
  BEST_APMC: "best_apmc",

  UNKNOWN: "unknown",
};

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export const ACTIONS = {
  NAVIGATE: "navigate",
  SPEAK: "speak",
  SHOW_HELP: "show_help",
  CONFIRM: "confirm",
  NONE: "none",
};

// ---------------------------------------------------------------------------
// Basic Intent Keyword Patterns (one-shot commands)
// ---------------------------------------------------------------------------

const BASIC_INTENT_PATTERNS = {
  [INTENTS.NAVIGATE_WEATHER]: {
    [LANGUAGES.EN]: [
      "weather", "forecast", "temperature", "rain", "climate", "show weather",
    ],
    [LANGUAGES.HI]: [
      "मौसम", "मौसम बताओ", "बारिश", "तापमान", "मौसम दिखाओ",
    ],
    route: ROUTES.WEATHER,
  },
  [INTENTS.NAVIGATE_DISEASE]: {
    [LANGUAGES.EN]: [
      "disease", "detect disease", "crop disease", "plant disease", "scan", "diagnose",
    ],
    [LANGUAGES.HI]: [
      "रोग", "रोग पहचानो", "बीमारी", "फसल रोग", "रोग बताओ",
    ],
    route: ROUTES.DISEASE_DETECTION,
  },
  [INTENTS.NAVIGATE_APMC]: {
    [LANGUAGES.EN]: [
      "apmc", "mandi", "prices", "show prices", "market", "market price", "crop price",
    ],
    [LANGUAGES.HI]: [
      "भाव", "भाव बताओ", "मंडी", "मंडी भाव", "बाजार भाव", "दाम", "APMC",
    ],
    route: ROUTES.APMC,
  },
  [INTENTS.NAVIGATE_HOME]: {
    [LANGUAGES.EN]: ["home", "go home", "main page", "start"],
    [LANGUAGES.HI]: ["होम", "घर", "मुख्य पेज", "शुरू"],
    route: ROUTES.HOME,
  },
  [INTENTS.SHOW_HELP]: {
    [LANGUAGES.EN]: ["help", "commands", "what can you do", "voice commands"],
    [LANGUAGES.HI]: ["मदद", "मदद चाहिए", "सहायता", "कमांड"],
    route: null,
  },
};

// ---------------------------------------------------------------------------
// Advanced Intent Keyword Patterns (parameterized queries)
// ---------------------------------------------------------------------------

const ADVANCED_INTENT_PATTERNS = {
  [INTENTS.QUERY_CROP_PRICE]: {
    [LANGUAGES.EN]: [
      "price of", "prices of", "show .* prices", "how much is",
      ".* price in", "cost of", "rate of",
    ],
    [LANGUAGES.HI]: [
      "का भाव", "का दाम", "की कीमत", "भाव बताओ", "भाव दिखाओ",
    ],
    route: ROUTES.APMC,
  },
  [INTENTS.QUERY_WEATHER_TIME]: {
    [LANGUAGES.EN]: [
      "weather tomorrow", "weather today", "weather next week",
      "forecast for", "temperature tomorrow", "rain tomorrow",
      "will it rain", "weather this week",
    ],
    [LANGUAGES.HI]: [
      "कल का मौसम", "आज का मौसम", "कल बारिश", "अगले हफ्ते का मौसम",
      "कल तापमान",
    ],
    route: ROUTES.WEATHER,
  },
  [INTENTS.QUERY_DISEASE_TREATMENT]: {
    [LANGUAGES.EN]: [
      "how to treat", "treatment for", "cure for", "remedy for",
      "how to fix", "solution for", "what is .* disease",
    ],
    [LANGUAGES.HI]: [
      "का इलाज", "कैसे ठीक करें", "का उपचार", "का उपाय",
      "रोग का इलाज",
    ],
    route: ROUTES.DISEASE_DETECTION,
  },
  [INTENTS.COMPARE_PRICES]: {
    [LANGUAGES.EN]: [
      "compare prices", "price comparison", "compare .* and",
      "which apmc", "which mandi", "difference in price",
    ],
    [LANGUAGES.HI]: [
      "भाव तुलना", "कीमत तुलना", "मंडी तुलना", "किस मंडी में", "किस APMC में",
    ],
    route: ROUTES.APMC,
  },
  [INTENTS.READ_ALERTS]: {
    [LANGUAGES.EN]: [
      "read alerts", "weather alerts", "any alerts", "show alerts",
      "warnings", "read warnings",
    ],
    [LANGUAGES.HI]: [
      "अलर्ट पढ़ो", "चेतावनी", "अलर्ट बताओ", "चेतावनी बताओ",
    ],
    route: ROUTES.WEATHER,
  },
  [INTENTS.BEST_APMC]: {
    [LANGUAGES.EN]: [
      "best apmc", "best mandi", "best market", "highest price", "best price",
      "where to sell", "best place to sell",
    ],
    [LANGUAGES.HI]: [
      "सबसे अच्छी मंडी", "सबसे ज्यादा भाव", "कहाँ बेचें",
      "बेहतरीन मंडी", "सबसे अच्छा APMC",
    ],
    route: ROUTES.APMC,
  },
};

// ---------------------------------------------------------------------------
// Voice Response Texts
// ---------------------------------------------------------------------------

const RESPONSES = {
  [INTENTS.NAVIGATE_WEATHER]: {
    [LANGUAGES.EN]: "Opening weather forecast.",
    [LANGUAGES.HI]: "मौसम की जानकारी दिखा रहे हैं।",
  },
  [INTENTS.NAVIGATE_DISEASE]: {
    [LANGUAGES.EN]: "Opening disease detection.",
    [LANGUAGES.HI]: "रोग पहचान खोल रहे हैं।",
  },
  [INTENTS.NAVIGATE_APMC]: {
    [LANGUAGES.EN]: "Opening APMC prices.",
    [LANGUAGES.HI]: "APMC भाव दिखा रहे हैं।",
  },
  [INTENTS.NAVIGATE_HOME]: {
    [LANGUAGES.EN]: "Going to home page.",
    [LANGUAGES.HI]: "मुख्य पेज पर जा रहे हैं।",
  },
  [INTENTS.SHOW_HELP]: {
    [LANGUAGES.EN]: "Here are the available commands.",
    [LANGUAGES.HI]: "यहाँ उपलब्ध कमांड हैं।",
  },
  [INTENTS.QUERY_CROP_PRICE]: {
    [LANGUAGES.EN]: "Opening APMC prices. You can search for {crop} there.",
    [LANGUAGES.HI]: "APMC भाव खोल रहे हैं। वहाँ {crop} खोजें।",
  },
  [INTENTS.QUERY_WEATHER_TIME]: {
    [LANGUAGES.EN]: "Opening weather forecast. Check {time} forecast.",
    [LANGUAGES.HI]: "मौसम की जानकारी दिखा रहे हैं। {time} का पूर्वानुमान देखें।",
  },
  [INTENTS.QUERY_DISEASE_TREATMENT]: {
    [LANGUAGES.EN]: "Opening disease detection. You can look up {disease} treatment there.",
    [LANGUAGES.HI]: "रोग पहचान खोल रहे हैं। वहाँ {disease} का इलाज देखें।",
  },
  [INTENTS.COMPARE_PRICES]: {
    [LANGUAGES.EN]: "Opening APMC prices for comparison.",
    [LANGUAGES.HI]: "तुलना के लिए APMC भाव खोल रहे हैं।",
  },
  [INTENTS.READ_ALERTS]: {
    [LANGUAGES.EN]: "Opening weather alerts.",
    [LANGUAGES.HI]: "मौसम अलर्ट दिखा रहे हैं।",
  },
  [INTENTS.BEST_APMC]: {
    [LANGUAGES.EN]: "Opening APMC prices to find the best market.",
    [LANGUAGES.HI]: "सबसे अच्छा APMC खोजने के लिए भाव दिखा रहे हैं।",
  },
  [INTENTS.UNKNOWN]: {
    [LANGUAGES.EN]: "Sorry, I did not understand that command.",
    [LANGUAGES.HI]: "क्षमा करें, यह कमांड समझ नहीं आई।",
  },
};

// ---------------------------------------------------------------------------
// Conversation Follow-up Responses
// ---------------------------------------------------------------------------

const FOLLOW_UP_RESPONSES = {
  askLocation: {
    [LANGUAGES.EN]: "For which location?",
    [LANGUAGES.HI]: "किस जगह के लिए?",
  },
  askCrop: {
    [LANGUAGES.EN]: "Which crop are you looking for?",
    [LANGUAGES.HI]: "कौन सी फसल?",
  },
  confirmAction: {
    [LANGUAGES.EN]: "Do you want me to proceed? Say yes or no.",
    [LANGUAGES.HI]: "क्या आगे बढ़ूँ? हाँ या नहीं बोलें।",
  },
  confirmed: {
    [LANGUAGES.EN]: "Done.",
    [LANGUAGES.HI]: "हो गया।",
  },
  cancelled: {
    [LANGUAGES.EN]: "Cancelled.",
    [LANGUAGES.HI]: "रद्द कर दिया।",
  },
  greeting: {
    [LANGUAGES.EN]: "Hello! How can I help you? Say 'help' to see available commands.",
    [LANGUAGES.HI]: "नमस्ते! मैं कैसे मदद कर सकता हूँ? 'मदद' बोलें उपलब्ध कमांड देखने के लिए।",
  },
};

// ---------------------------------------------------------------------------
// Available Commands (for help display - basic + advanced)
// ---------------------------------------------------------------------------

export const AVAILABLE_COMMANDS = [
  {
    intent: INTENTS.NAVIGATE_WEATHER,
    label: { [LANGUAGES.EN]: "Weather Forecast", [LANGUAGES.HI]: "मौसम की जानकारी" },
    examples: {
      [LANGUAGES.EN]: ["weather", "show weather", "forecast"],
      [LANGUAGES.HI]: ["मौसम बताओ", "मौसम दिखाओ"],
    },
    offline: true,
  },
  {
    intent: INTENTS.NAVIGATE_DISEASE,
    label: { [LANGUAGES.EN]: "Disease Detection", [LANGUAGES.HI]: "रोग पहचान" },
    examples: {
      [LANGUAGES.EN]: ["detect disease", "scan crop", "diagnose"],
      [LANGUAGES.HI]: ["रोग पहचानो", "रोग बताओ"],
    },
    offline: true,
  },
  {
    intent: INTENTS.NAVIGATE_APMC,
    label: { [LANGUAGES.EN]: "APMC Price", [LANGUAGES.HI]: "APMC भाव" },
    examples: {
      [LANGUAGES.EN]: ["show prices", "apmc prices", "market price"],
      [LANGUAGES.HI]: ["भाव बताओ", "APMC भाव"],
    },
    offline: true,
  },
  {
    intent: INTENTS.NAVIGATE_HOME,
    label: { [LANGUAGES.EN]: "Home Page", [LANGUAGES.HI]: "मुख्य पेज" },
    examples: {
      [LANGUAGES.EN]: ["home", "go home"],
      [LANGUAGES.HI]: ["होम", "घर"],
    },
    offline: true,
  },
  {
    intent: INTENTS.SHOW_HELP,
    label: { [LANGUAGES.EN]: "Help", [LANGUAGES.HI]: "सहायता" },
    examples: {
      [LANGUAGES.EN]: ["help", "commands"],
      [LANGUAGES.HI]: ["मदद", "सहायता"],
    },
    offline: true,
  },
];

export const ADVANCED_COMMANDS = [
  {
    intent: INTENTS.QUERY_CROP_PRICE,
    label: { [LANGUAGES.EN]: "Crop Prices", [LANGUAGES.HI]: "फसल भाव" },
    examples: {
      [LANGUAGES.EN]: ["show wheat prices", "price of rice in Punjab"],
      [LANGUAGES.HI]: ["गेहूं का भाव", "पंजाब में चावल का दाम"],
    },
    offline: true,
  },
  {
    intent: INTENTS.QUERY_WEATHER_TIME,
    label: { [LANGUAGES.EN]: "Weather by Time", [LANGUAGES.HI]: "समय अनुसार मौसम" },
    examples: {
      [LANGUAGES.EN]: ["weather tomorrow", "will it rain today"],
      [LANGUAGES.HI]: ["कल का मौसम", "आज बारिश होगी"],
    },
    offline: true,
  },
  {
    intent: INTENTS.QUERY_DISEASE_TREATMENT,
    label: { [LANGUAGES.EN]: "Disease Treatment", [LANGUAGES.HI]: "रोग उपचार" },
    examples: {
      [LANGUAGES.EN]: ["how to treat paddy blast", "cure for leaf blight"],
      [LANGUAGES.HI]: ["धान ब्लास्ट का इलाज", "पत्ती झुलसा का उपचार"],
    },
    offline: true,
  },
  {
    intent: INTENTS.COMPARE_PRICES,
    label: { [LANGUAGES.EN]: "Compare Prices", [LANGUAGES.HI]: "भाव तुलना" },
    examples: {
      [LANGUAGES.EN]: ["compare prices in Ludhiana and Amritsar"],
      [LANGUAGES.HI]: ["लुधियाना और अमृतसर में भाव तुलना"],
    },
    offline: true,
  },
  {
    intent: INTENTS.READ_ALERTS,
    label: { [LANGUAGES.EN]: "Weather Alerts", [LANGUAGES.HI]: "मौसम अलर्ट" },
    examples: {
      [LANGUAGES.EN]: ["read alerts", "any warnings"],
      [LANGUAGES.HI]: ["अलर्ट पढ़ो", "चेतावनी बताओ"],
    },
    offline: true,
  },
  {
    intent: INTENTS.BEST_APMC,
    label: { [LANGUAGES.EN]: "Best APMC", [LANGUAGES.HI]: "सबसे अच्छा APMC" },
    examples: {
      [LANGUAGES.EN]: ["best apmc", "where to sell"],
      [LANGUAGES.HI]: ["सबसे अच्छा APMC", "कहाँ बेचें"],
    },
    offline: true,
  },
];

// ---------------------------------------------------------------------------
// Entity Data - Locations
// ---------------------------------------------------------------------------

const INDIAN_STATES = [
  "Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Rajasthan",
  "Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Andhra Pradesh",
  "Telangana", "Bihar", "West Bengal", "Odisha", "Chhattisgarh",
  "Jharkhand", "Assam", "Kerala", "Himachal Pradesh", "Uttarakhand",
];

const INDIAN_STATES_HI = [
  "पंजाब", "हरियाणा", "उत्तर प्रदेश", "मध्य प्रदेश", "राजस्थान",
  "महाराष्ट्र", "गुजरात", "कर्नाटक", "तमिलनाडु", "आंध्र प्रदेश",
  "तेलंगाना", "बिहार", "पश्चिम बंगाल", "ओडिशा", "छत्तीसगढ़",
  "झारखंड", "असम", "केरल", "हिमाचल प्रदेश", "उत्तराखंड",
];

const MANDI_CITIES = [
  "Ludhiana", "Amritsar", "Jalandhar", "Chandigarh", "Karnal", "Hisar",
  "Lucknow", "Kanpur", "Agra", "Varanasi", "Jaipur", "Jodhpur", "Kota",
  "Indore", "Bhopal", "Nagpur", "Pune", "Mumbai", "Nashik",
  "Ahmedabad", "Surat", "Rajkot", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Patna", "Bhubaneswar", "Raipur", "Ranchi", "Guwahati",
  "Dehradun", "Shimla", "Thiruvananthapuram",
];

const MANDI_CITIES_HI = [
  "लुधियाना", "अमृतसर", "जालंधर", "चंडीगढ़", "करनाल", "हिसार",
  "लखनऊ", "कानपुर", "आगरा", "वाराणसी", "जयपुर", "जोधपुर", "कोटा",
  "इंदौर", "भोपाल", "नागपुर", "पुणे", "मुंबई", "नासिक",
  "अहमदाबाद", "सूरत", "राजकोट", "बेंगलुरु", "हैदराबाद", "चेन्नई",
  "कोलकाता", "पटना", "भुवनेश्वर", "रायपुर", "रांची", "गुवाहाटी",
  "देहरादून", "शिमला", "तिरुवनंतपुरम",
];

// ---------------------------------------------------------------------------
// Entity Data - Diseases
// ---------------------------------------------------------------------------

const CROP_DISEASES_EN = [
  "paddy blast", "rice blast", "leaf blight", "bacterial leaf blight",
  "brown spot", "sheath blight", "stem rot", "root rot",
  "rust", "wheat rust", "yellow rust", "black rust",
  "powdery mildew", "downy mildew",
  "late blight", "early blight",
  "wilt", "fusarium wilt",
  "anthracnose", "smut", "mosaic virus", "leaf curl",
  "tikka disease", "blast", "blight",
];

const CROP_DISEASES_HI = [
  "धान ब्लास्ट", "पत्ती झुलसा", "भूरा धब्बा", "तना सड़न",
  "जड़ सड़न", "गेरुई", "चूर्णिल आसिता", "मृदुरोमिल आसिता",
  "उकठा", "कंडुआ", "मोजेक", "पत्ती मोड़",
  "ब्लास्ट", "झुलसा",
];

// ---------------------------------------------------------------------------
// Entity Data - Time References
// ---------------------------------------------------------------------------

const TIME_REFERENCES_EN = {
  today: "today",
  tomorrow: "tomorrow",
  yesterday: "yesterday",
  "day after tomorrow": "day after tomorrow",
  "next week": "next week",
  "this week": "this week",
};

const TIME_REFERENCES_HI = {
  "आज": "today",
  "कल": "tomorrow",
  "परसों": "day after tomorrow",
  "अगले हफ्ते": "next week",
  "इस हफ्ते": "this week",
};

// ---------------------------------------------------------------------------
// Entity Data - Crops (derived from constants)
// ---------------------------------------------------------------------------

const CROPS_EN = SUPPORTED_CROPS.map((c) => c.toLowerCase());

const CROPS_HI_MAP = {
  "धान": "Paddy",
  "चावल": "Paddy",
  "गेहूं": "Wheat",
  "कपास": "Cotton",
  "गन्ना": "Sugarcane",
  "टमाटर": "Tomato",
  "आलू": "Potato",
  "प्याज": "Onion",
  "मिर्च": "Chilli",
  "मक्का": "Maize",
  "दालें": "Pulses",
  "दाल": "Pulses",
  "तिलहन": "Oilseeds",
  "बाजरा": "Millets",
  "ज्वार": "Millets",
  "रागी": "Millets",
};

// ---------------------------------------------------------------------------
// Confirmation Keywords
// ---------------------------------------------------------------------------

const CONFIRM_KEYWORDS = {
  yes: ["yes", "yeah", "yep", "sure", "ok", "okay", "confirm", "proceed", "go ahead"],
  no: ["no", "nope", "cancel", "stop", "nevermind", "never mind"],
  yesHi: ["हाँ", "हां", "जी", "ठीक", "ठीक है", "चलो", "आगे बढ़ो"],
  noHi: ["नहीं", "मत", "रुको", "बंद करो", "रद्द"],
};

// ---------------------------------------------------------------------------
// Entity Extraction Functions
// ---------------------------------------------------------------------------

/**
 * Extract crop names from text.
 *
 * @param {string} text - Normalized input text.
 * @returns {string[]} Matched crop names (canonical English form).
 */
export function extractCrops(text) {
  const lower = text.toLowerCase();
  const found = [];

  for (const crop of CROPS_EN) {
    if (lower.includes(crop)) {
      const canonical = SUPPORTED_CROPS.find((c) => c.toLowerCase() === crop);
      if (canonical && !found.includes(canonical)) {
        found.push(canonical);
      }
    }
  }

  for (const [hindi, english] of Object.entries(CROPS_HI_MAP)) {
    if (text.includes(hindi) && !found.includes(english)) {
      found.push(english);
    }
  }

  return found;
}

/**
 * Extract location names from text.
 *
 * @param {string} text - Input text.
 * @returns {string[]} Matched location names.
 */
export function extractLocations(text) {
  const lower = text.toLowerCase();
  const found = [];

  const allLocationsEn = [...INDIAN_STATES, ...MANDI_CITIES];
  for (const loc of allLocationsEn) {
    if (lower.includes(loc.toLowerCase()) && !found.includes(loc)) {
      found.push(loc);
    }
  }

  const allLocationsHi = [...INDIAN_STATES_HI, ...MANDI_CITIES_HI];
  for (let i = 0; i < allLocationsHi.length; i++) {
    if (text.includes(allLocationsHi[i])) {
      const enEquiv = i < INDIAN_STATES_HI.length
        ? INDIAN_STATES[i]
        : MANDI_CITIES[i - INDIAN_STATES_HI.length];
      if (enEquiv && !found.includes(enEquiv)) {
        found.push(enEquiv);
      }
    }
  }

  return found;
}

/**
 * Extract time references from text.
 *
 * @param {string} text - Input text.
 * @returns {string|null} Normalized time reference or null.
 */
export function extractTimeReference(text) {
  const lower = text.toLowerCase();

  for (const [phrase, normalized] of Object.entries(TIME_REFERENCES_EN)) {
    if (lower.includes(phrase)) {
      return normalized;
    }
  }

  for (const [phrase, normalized] of Object.entries(TIME_REFERENCES_HI)) {
    if (text.includes(phrase)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Extract disease names from text.
 *
 * @param {string} text - Input text.
 * @returns {string[]} Matched disease names.
 */
export function extractDiseases(text) {
  const lower = text.toLowerCase();
  const found = [];

  for (const disease of CROP_DISEASES_EN) {
    if (lower.includes(disease) && !found.includes(disease)) {
      found.push(disease);
    }
  }

  for (const disease of CROP_DISEASES_HI) {
    if (text.includes(disease) && !found.includes(disease)) {
      found.push(disease);
    }
  }

  return found;
}

/**
 * Extract all entities from text.
 *
 * @param {string} text - Input text.
 * @returns {{ crops: string[], locations: string[], timeRef: string|null, diseases: string[] }}
 */
export function extractEntities(text) {
  if (!text || typeof text !== "string") {
    return { crops: [], locations: [], timeRef: null, diseases: [] };
  }
  return {
    crops: extractCrops(text),
    locations: extractLocations(text),
    timeRef: extractTimeReference(text),
    diseases: extractDiseases(text),
  };
}

// ---------------------------------------------------------------------------
// Intent Recognition Helpers
// ---------------------------------------------------------------------------

const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Calculate match score between user input and a keyword.
 *
 * @param {string} input   - Normalized user input.
 * @param {string} keyword - Normalized keyword to match against.
 * @returns {number} Match confidence from 0 to 1.
 */
function calculateMatchScore(input, keyword) {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedKeyword = keyword.toLowerCase().trim();

  if (!normalizedInput || !normalizedKeyword) {
    return 0;
  }

  if (normalizedInput === normalizedKeyword) {
    return 1.0;
  }

  if (normalizedInput.includes(normalizedKeyword)) {
    return 0.9;
  }

  if (normalizedKeyword.includes(normalizedInput)) {
    return 0.7;
  }

  const inputWords = normalizedInput.split(/\s+/);
  const keywordWords = normalizedKeyword.split(/\s+/);
  const matchCount = inputWords.filter((word) =>
    keywordWords.some((kw) => kw.includes(word) || word.includes(kw)),
  ).length;

  if (matchCount > 0) {
    const maxLen = Math.max(inputWords.length, keywordWords.length);
    return (matchCount / maxLen) * 0.8;
  }

  return 0;
}

/**
 * Try to match a regex-style pattern against input text.
 * Patterns may contain .* for wildcards.
 *
 * @param {string} input   - User input.
 * @param {string} pattern - Pattern (may contain .*).
 * @returns {number} Match confidence from 0 to 1.
 */
function calculateAdvancedMatchScore(input, pattern) {
  const normalizedInput = input.toLowerCase().trim();

  if (pattern.includes(".*")) {
    try {
      const regex = new RegExp(pattern.toLowerCase(), "i");
      if (regex.test(normalizedInput)) {
        return 0.85;
      }
    } catch {
      // Fallback to simple match if regex is invalid
    }
  }

  return calculateMatchScore(input, pattern);
}

// ---------------------------------------------------------------------------
// Basic Command Parsing (one-shot, used by VoiceButton)
// ---------------------------------------------------------------------------

/**
 * Parse a voice transcript for basic navigation commands.
 * This is the simple, stateless parser for one-shot commands.
 *
 * @param {string} text     - The voice transcript text.
 * @param {string} language - Current UI language.
 * @returns {{ intent: string, confidence: number, route: string|null, response: string }}
 */
export function parseCommand(text, language = LANGUAGES.EN) {
  if (!text || typeof text !== "string") {
    return {
      intent: INTENTS.UNKNOWN,
      confidence: 0,
      route: null,
      response: getResponse(INTENTS.UNKNOWN, language),
    };
  }

  const normalizedText = text.toLowerCase().trim();
  let bestMatch = { intent: INTENTS.UNKNOWN, confidence: 0, route: null };

  // Check basic patterns
  for (const [intent, config] of Object.entries(BASIC_INTENT_PATTERNS)) {
    for (const lang of [LANGUAGES.EN, LANGUAGES.HI]) {
      const keywords = config[lang] || [];
      for (const keyword of keywords) {
        const score = calculateMatchScore(normalizedText, keyword);
        if (score > bestMatch.confidence) {
          bestMatch = { intent, confidence: score, route: config.route };
        }
      }
    }
  }

  // Check advanced patterns if basic didn't match well
  if (bestMatch.confidence < 0.8) {
    for (const [intent, config] of Object.entries(ADVANCED_INTENT_PATTERNS)) {
      for (const lang of [LANGUAGES.EN, LANGUAGES.HI]) {
        const patterns = config[lang] || [];
        for (const pattern of patterns) {
          const score = calculateAdvancedMatchScore(normalizedText, pattern);
          if (score > bestMatch.confidence) {
            bestMatch = { intent, confidence: score, route: config.route };
          }
        }
      }
    }
  }

  if (bestMatch.confidence < CONFIDENCE_THRESHOLD) {
    bestMatch = { intent: INTENTS.UNKNOWN, confidence: bestMatch.confidence, route: null };
  }

  const entities = extractEntities(text);
  const response = buildResponse(bestMatch.intent, language, entities);

  return {
    intent: bestMatch.intent,
    confidence: bestMatch.confidence,
    route: bestMatch.route,
    response,
    entities,
  };
}

// ---------------------------------------------------------------------------
// Response Builder
// ---------------------------------------------------------------------------

/**
 * Get the raw response template for an intent.
 */
function getResponse(intent, language) {
  const templates = RESPONSES[intent];
  if (!templates) {
    return RESPONSES[INTENTS.UNKNOWN][language] || RESPONSES[INTENTS.UNKNOWN][LANGUAGES.EN];
  }
  return templates[language] || templates[LANGUAGES.EN];
}

/**
 * Build a response string, substituting extracted entity placeholders.
 */
function buildResponse(intent, language, entities) {
  let response = getResponse(intent, language);

  if (entities) {
    const crop = entities.crops.length > 0 ? entities.crops[0] : "";
    const location = entities.locations.length > 0 ? entities.locations[0] : "";
    const time = entities.timeRef || "";
    const disease = entities.diseases.length > 0 ? entities.diseases[0] : "";

    response = response
      .replace("{crop}", crop || (language === LANGUAGES.HI ? "फसल" : "the crop"))
      .replace("{location}", location || "")
      .replace("{time}", time || (language === LANGUAGES.HI ? "" : "the"))
      .replace("{disease}", disease || (language === LANGUAGES.HI ? "रोग" : "the disease"));
  }

  return response;
}

// ---------------------------------------------------------------------------
// Conversation Engine (multi-turn, context-aware)
// ---------------------------------------------------------------------------

const CONVERSATION_STATES = {
  IDLE: "idle",
  AWAITING_LOCATION: "awaiting_location",
  AWAITING_CROP: "awaiting_crop",
  AWAITING_CONFIRMATION: "awaiting_confirmation",
};

let messageIdCounter = 0;

function generateMessageId() {
  messageIdCounter += 1;
  return `msg_${Date.now()}_${messageIdCounter}`;
}

/**
 * ConversationEngine - Stateful, context-aware command processor.
 *
 * Maintains conversation history, accumulated entities,
 * and supports multi-turn slot-filling dialogues.
 */
export class ConversationEngine {
  /**
   * @param {string} language - Initial language preference.
   */
  constructor(language = LANGUAGES.EN) {
    this.messages = [];
    this.context = {
      crop: null,
      location: null,
      timeRef: null,
      disease: null,
      lastIntent: null,
    };
    this.conversationState = CONVERSATION_STATES.IDLE;
    this.pendingAction = null;
    this.language = language;

    this._loadHistory();
  }

  /**
   * Process a user message and return a structured result.
   *
   * @param {string} text     - User input (voice transcript or typed text).
   * @param {string} language - Current UI language.
   * @returns {{ intent: string, confidence: number, route: string|null, response: string, action: string, entities: object }}
   */
  process(text, language = this.language) {
    this.language = language;

    if (!text || typeof text !== "string" || !text.trim()) {
      return this._buildResult(INTENTS.UNKNOWN, 0, null, ACTIONS.NONE, {});
    }

    const trimmed = text.trim();

    // Add user message to history
    const entities = extractEntities(trimmed);
    this._mergeEntities(entities);

    // Handle conversation state (slot-filling)
    if (this.conversationState !== CONVERSATION_STATES.IDLE) {
      return this._handleFollowUp(trimmed, entities, language);
    }

    // Check for confirmation keywords (standalone "yes"/"no")
    if (this._isConfirmation(trimmed)) {
      return this._handleConfirmation(trimmed, language);
    }

    // Parse intent
    const parsed = parseCommand(trimmed, language);

    // Store user message
    this._addMessage("user", trimmed, parsed.intent, entities, parsed.confidence);

    // Determine if we need more info (slot-filling)
    if (this._needsMoreInfo(parsed.intent, entities)) {
      return this._askForMoreInfo(parsed.intent, entities, language);
    }

    // Build response with entity context
    const response = buildResponse(parsed.intent, language, {
      crops: entities.crops.length > 0 ? entities.crops : (this.context.crop ? [this.context.crop] : []),
      locations: entities.locations.length > 0 ? entities.locations : (this.context.location ? [this.context.location] : []),
      timeRef: entities.timeRef || this.context.timeRef,
      diseases: entities.diseases.length > 0 ? entities.diseases : (this.context.disease ? [this.context.disease] : []),
    });

    // Store assistant response
    this._addMessage("assistant", response);

    // Update context
    this.context.lastIntent = parsed.intent;

    const action = parsed.intent === INTENTS.SHOW_HELP
      ? ACTIONS.SHOW_HELP
      : parsed.route
        ? ACTIONS.NAVIGATE
        : ACTIONS.SPEAK;

    this._saveHistory();

    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      route: parsed.route,
      response,
      action,
      entities: {
        crops: entities.crops,
        locations: entities.locations,
        timeRef: entities.timeRef,
        diseases: entities.diseases,
      },
    };
  }

  /**
   * Add an assistant-only message (e.g., greeting, error).
   */
  addAssistantMessage(text) {
    this._addMessage("assistant", text);
    this._saveHistory();
  }

  /**
   * Get all conversation messages.
   *
   * @returns {Array<{ id: string, role: string, text: string, timestamp: string, intent?: string, entities?: object, confidence?: number }>}
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Get the current accumulated context.
   */
  getContext() {
    return { ...this.context };
  }

  /**
   * Clear the conversation context (keep messages).
   */
  clearContext() {
    this.context = {
      crop: null,
      location: null,
      timeRef: null,
      disease: null,
      lastIntent: null,
    };
    this.conversationState = CONVERSATION_STATES.IDLE;
    this.pendingAction = null;
  }

  /**
   * Clear all messages and reset context.
   */
  clear() {
    this.messages = [];
    this.clearContext();
    storage.remove(STORAGE_KEYS.VOICE_CHAT_HISTORY);
  }

  /**
   * Update the engine language.
   */
  setLanguage(language) {
    this.language = language;
  }

  // --- Private Methods -------------------------------------------------------

  _addMessage(role, text, intent = null, entities = null, confidence = null) {
    const message = {
      id: generateMessageId(),
      role,
      text,
      timestamp: new Date().toISOString(),
    };
    if (intent) message.intent = intent;
    if (entities) message.entities = entities;
    if (confidence !== null) message.confidence = confidence;

    this.messages.push(message);
  }

  _mergeEntities(entities) {
    if (entities.crops.length > 0) {
      this.context.crop = entities.crops[0];
    }
    if (entities.locations.length > 0) {
      this.context.location = entities.locations[0];
    }
    if (entities.timeRef) {
      this.context.timeRef = entities.timeRef;
    }
    if (entities.diseases.length > 0) {
      this.context.disease = entities.diseases[0];
    }
  }

  _needsMoreInfo(intent, entities) {
    if (intent === INTENTS.QUERY_CROP_PRICE && entities.crops.length === 0 && !this.context.crop) {
      return true;
    }
    if (intent === INTENTS.COMPARE_PRICES && entities.locations.length < 2 && !this.context.location) {
      return true;
    }
    return false;
  }

  _askForMoreInfo(intent, entities, language) {
    let followUp;
    if (intent === INTENTS.QUERY_CROP_PRICE && entities.crops.length === 0) {
      this.conversationState = CONVERSATION_STATES.AWAITING_CROP;
      followUp = FOLLOW_UP_RESPONSES.askCrop[language] || FOLLOW_UP_RESPONSES.askCrop[LANGUAGES.EN];
    } else if (intent === INTENTS.COMPARE_PRICES && entities.locations.length < 2) {
      this.conversationState = CONVERSATION_STATES.AWAITING_LOCATION;
      followUp = FOLLOW_UP_RESPONSES.askLocation[language] || FOLLOW_UP_RESPONSES.askLocation[LANGUAGES.EN];
    } else {
      followUp = FOLLOW_UP_RESPONSES.askCrop[language] || FOLLOW_UP_RESPONSES.askCrop[LANGUAGES.EN];
      this.conversationState = CONVERSATION_STATES.AWAITING_CROP;
    }

    this.pendingAction = { intent, entities };
    this._addMessage("assistant", followUp);
    this._saveHistory();

    return {
      intent,
      confidence: 0.6,
      route: null,
      response: followUp,
      action: ACTIONS.SPEAK,
      entities: { crops: entities.crops, locations: entities.locations, timeRef: entities.timeRef, diseases: entities.diseases },
    };
  }

  _handleFollowUp(text, entities, language) {
    this._addMessage("user", text, null, entities);

    const prevIntent = this.pendingAction ? this.pendingAction.intent : this.context.lastIntent;
    const route = prevIntent
      ? (ADVANCED_INTENT_PATTERNS[prevIntent]?.route || BASIC_INTENT_PATTERNS[prevIntent]?.route || null)
      : null;

    // Merge newly extracted entities
    const mergedEntities = {
      crops: entities.crops.length > 0 ? entities.crops : (this.context.crop ? [this.context.crop] : []),
      locations: entities.locations.length > 0 ? entities.locations : (this.context.location ? [this.context.location] : []),
      timeRef: entities.timeRef || this.context.timeRef,
      diseases: entities.diseases.length > 0 ? entities.diseases : (this.context.disease ? [this.context.disease] : []),
    };

    // If the user just gave a bare noun that could be a crop
    if (this.conversationState === CONVERSATION_STATES.AWAITING_CROP && entities.crops.length === 0) {
      const possibleCrop = this._tryMatchCrop(text);
      if (possibleCrop) {
        mergedEntities.crops = [possibleCrop];
        this.context.crop = possibleCrop;
      }
    }

    // If the user just gave a bare location
    if (this.conversationState === CONVERSATION_STATES.AWAITING_LOCATION && entities.locations.length === 0) {
      const possibleLoc = this._tryMatchLocation(text);
      if (possibleLoc) {
        mergedEntities.locations = [possibleLoc];
        this.context.location = possibleLoc;
      }
    }

    const response = buildResponse(prevIntent || INTENTS.UNKNOWN, language, mergedEntities);

    this._addMessage("assistant", response);
    this.context.lastIntent = prevIntent;
    this.conversationState = CONVERSATION_STATES.IDLE;
    this.pendingAction = null;
    this._saveHistory();

    return {
      intent: prevIntent || INTENTS.UNKNOWN,
      confidence: 0.75,
      route,
      response,
      action: route ? ACTIONS.NAVIGATE : ACTIONS.SPEAK,
      entities: mergedEntities,
    };
  }

  _isConfirmation(text) {
    const lower = text.toLowerCase().trim();
    const allYes = [...CONFIRM_KEYWORDS.yes, ...CONFIRM_KEYWORDS.yesHi];
    const allNo = [...CONFIRM_KEYWORDS.no, ...CONFIRM_KEYWORDS.noHi];
    return allYes.includes(lower) || allNo.includes(lower);
  }

  _handleConfirmation(text, language) {
    const lower = text.toLowerCase().trim();
    const isYes = [...CONFIRM_KEYWORDS.yes, ...CONFIRM_KEYWORDS.yesHi].includes(lower);

    this._addMessage("user", text);

    if (isYes && this.pendingAction) {
      const response = FOLLOW_UP_RESPONSES.confirmed[language] || FOLLOW_UP_RESPONSES.confirmed[LANGUAGES.EN];
      this._addMessage("assistant", response);
      const result = {
        intent: this.pendingAction.intent,
        confidence: 1.0,
        route: ADVANCED_INTENT_PATTERNS[this.pendingAction.intent]?.route
          || BASIC_INTENT_PATTERNS[this.pendingAction.intent]?.route
          || null,
        response,
        action: ACTIONS.NAVIGATE,
        entities: this.pendingAction.entities || {},
      };
      this.conversationState = CONVERSATION_STATES.IDLE;
      this.pendingAction = null;
      this._saveHistory();
      return result;
    }

    const response = FOLLOW_UP_RESPONSES.cancelled[language] || FOLLOW_UP_RESPONSES.cancelled[LANGUAGES.EN];
    this._addMessage("assistant", response);
    this.conversationState = CONVERSATION_STATES.IDLE;
    this.pendingAction = null;
    this._saveHistory();

    return {
      intent: INTENTS.UNKNOWN,
      confidence: 1.0,
      route: null,
      response,
      action: ACTIONS.NONE,
      entities: {},
    };
  }

  _tryMatchCrop(text) {
    const lower = text.toLowerCase().trim();
    for (const crop of SUPPORTED_CROPS) {
      if (lower.includes(crop.toLowerCase())) {
        return crop;
      }
    }
    for (const [hindi, english] of Object.entries(CROPS_HI_MAP)) {
      if (text.includes(hindi)) {
        return english;
      }
    }
    // Try fuzzy: if the whole input is a single word, check starts-with
    const singleWord = lower.replace(/\s+/g, "");
    for (const crop of SUPPORTED_CROPS) {
      if (crop.toLowerCase().startsWith(singleWord) && singleWord.length >= 3) {
        return crop;
      }
    }
    return null;
  }

  _tryMatchLocation(text) {
    const lower = text.toLowerCase().trim();
    for (const loc of [...INDIAN_STATES, ...MANDI_CITIES]) {
      if (lower.includes(loc.toLowerCase())) {
        return loc;
      }
    }
    for (let i = 0; i < INDIAN_STATES_HI.length; i++) {
      if (text.includes(INDIAN_STATES_HI[i])) {
        return INDIAN_STATES[i];
      }
    }
    for (let i = 0; i < MANDI_CITIES_HI.length; i++) {
      if (text.includes(MANDI_CITIES_HI[i])) {
        return MANDI_CITIES[i];
      }
    }
    return null;
  }

  _saveHistory() {
    try {
      const toSave = this.messages.slice(-100);
      storage.set(STORAGE_KEYS.VOICE_CHAT_HISTORY, toSave);
    } catch {
      // Storage write failure is non-critical
    }
  }

  _loadHistory() {
    try {
      const saved = storage.get(STORAGE_KEYS.VOICE_CHAT_HISTORY, []);
      if (Array.isArray(saved)) {
        this.messages = saved;
      }
    } catch {
      this.messages = [];
    }
  }
}

// ---------------------------------------------------------------------------
// Voice Settings Management
// ---------------------------------------------------------------------------

export const DEFAULT_VOICE_SETTINGS = {
  speechRate: 0.9,
  voiceGender: "female",
  language: LANGUAGES.EN,
  autoSpeak: true,
};

/**
 * Load voice settings from localStorage, merging with defaults.
 *
 * @returns {typeof DEFAULT_VOICE_SETTINGS}
 */
export function getVoiceSettings() {
  const saved = storage.get(STORAGE_KEYS.VOICE_SETTINGS, null);
  if (!saved || typeof saved !== "object") {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
  return { ...DEFAULT_VOICE_SETTINGS, ...saved };
}

/**
 * Persist voice settings to localStorage.
 *
 * @param {Partial<typeof DEFAULT_VOICE_SETTINGS>} settings
 */
export function saveVoiceSettings(settings) {
  const current = getVoiceSettings();
  const merged = { ...current, ...settings };
  storage.set(STORAGE_KEYS.VOICE_SETTINGS, merged);
  return merged;
}

// ---------------------------------------------------------------------------
// Tutorial State
// ---------------------------------------------------------------------------

/**
 * Check whether the voice tutorial has been shown.
 */
export function isTutorialShown() {
  return storage.get(STORAGE_KEYS.VOICE_TUTORIAL_SHOWN, false) === true;
}

/**
 * Mark the voice tutorial as shown.
 */
export function markTutorialShown() {
  storage.set(STORAGE_KEYS.VOICE_TUTORIAL_SHOWN, true);
}

// ---------------------------------------------------------------------------
// Text-to-Speech
// ---------------------------------------------------------------------------

const VOICE_LANG_MAP = {
  [LANGUAGES.EN]: "en-IN",
  [LANGUAGES.HI]: "hi-IN",
};

let currentUtterance = null;

/**
 * Check if speech synthesis is supported.
 *
 * @returns {boolean}
 */
export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis);
}

/**
 * Find a suitable voice for the given language and gender preference.
 *
 * @param {string} langCode - BCP-47 language code (e.g., "en-IN").
 * @param {string} gender   - Preferred gender: "male" or "female".
 * @returns {SpeechSynthesisVoice|null}
 */
function findVoice(langCode, gender) {
  if (!isSpeechSynthesisSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Try exact language + gender match
  const genderKeyword = gender === "male" ? /male/i : /female/i;
  const exactMatch = voices.find(
    (v) => v.lang === langCode && genderKeyword.test(v.name),
  );
  if (exactMatch) return exactMatch;

  // Try exact language match (any gender)
  const langMatch = voices.find((v) => v.lang === langCode);
  if (langMatch) return langMatch;

  // Try language prefix match (e.g., "en" for "en-IN")
  const prefix = langCode.split("-")[0];
  const prefixMatch = voices.find((v) => v.lang.startsWith(prefix));
  return prefixMatch || null;
}

/**
 * Speak the given text using the Web Speech Synthesis API.
 *
 * @param {string} text       - Text to speak.
 * @param {string} language   - Language code (LANGUAGES.EN or LANGUAGES.HI).
 * @param {object} [settings] - Optional voice settings override.
 * @returns {Promise<void>} Resolves when speech ends.
 */
export function speak(text, language = LANGUAGES.EN, settings = null) {
  return new Promise((resolve, reject) => {
    if (!isSpeechSynthesisSupported()) {
      reject(new Error("Speech synthesis is not supported in this browser."));
      return;
    }

    const voiceSettings = settings || getVoiceSettings();

    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = VOICE_LANG_MAP[language] || "en-IN";
    utterance.rate = voiceSettings.speechRate || 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = findVoice(utterance.lang, voiceSettings.voiceGender);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      if (event.error === "canceled") {
        resolve();
        return;
      }
      reject(new Error(`Speech synthesis error: ${event.error}`));
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Cancel any ongoing speech synthesis.
 */
export function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/**
 * Check if speech synthesis is currently speaking.
 *
 * @returns {boolean}
 */
export function isSpeaking() {
  return (
    typeof window !== "undefined" &&
    window.speechSynthesis &&
    window.speechSynthesis.speaking
  );
}

// ---------------------------------------------------------------------------
// Browser Compatibility
// ---------------------------------------------------------------------------

/**
 * Check browser compatibility for voice features.
 *
 * @returns {{ speechRecognition: boolean, speechSynthesis: boolean, microphone: boolean, isFullySupported: boolean }}
 */
export function checkCompatibility() {
  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const hasSpeechSynthesis =
    typeof window !== "undefined" && Boolean(window.speechSynthesis);

  const hasMicrophone =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  return {
    speechRecognition: hasSpeechRecognition,
    speechSynthesis: hasSpeechSynthesis,
    microphone: hasMicrophone,
    isFullySupported:
      hasSpeechRecognition && hasSpeechSynthesis && hasMicrophone,
  };
}

// ---------------------------------------------------------------------------
// Microphone Permission
// ---------------------------------------------------------------------------

/**
 * Request microphone permission from the user.
 *
 * @returns {Promise<"granted"|"denied">}
 */
export async function requestMicrophonePermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return "denied";
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/**
 * Query the current microphone permission state without prompting.
 *
 * @returns {Promise<"granted"|"denied"|"prompt">}
 */
export async function getMicrophonePermissionState() {
  if (!navigator.permissions) {
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state;
  } catch {
    return "prompt";
  }
}
