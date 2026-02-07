/**
 * i18n Configuration
 *
 * Internationalization setup using i18next and react-i18next.
 * Supports English, Hindi, and Gujarati languages.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "@locales/en/translation.json";
import hiTranslation from "@locales/hi/translation.json";
import guTranslation from "@locales/gu/translation.json";

import { STORAGE_KEYS, DEFAULT_LANGUAGE } from "@utils/constants";

const resources = {
  en: {
    translation: enTranslation,
  },
  hi: {
    translation: hiTranslation,
  },
  gu: {
    translation: guTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    debug: import.meta.env.DEV,

    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEYS.LANGUAGE,
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
