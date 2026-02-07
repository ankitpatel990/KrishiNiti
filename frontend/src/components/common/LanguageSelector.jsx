/**
 * LanguageSelector - Dropdown component for selecting UI language.
 *
 * Supports English, Hindi, and Gujarati.
 * Persists selection to localStorage and updates i18n context.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { ChevronDownIcon, LanguageIcon, CheckIcon } from "@heroicons/react/24/outline";
import { LANGUAGES, LANGUAGE_NAMES } from "@utils/constants";

const LANGUAGE_OPTIONS = [
  { code: LANGUAGES.EN, name: LANGUAGE_NAMES[LANGUAGES.EN], nativeName: "English" },
  { code: LANGUAGES.HI, name: LANGUAGE_NAMES[LANGUAGES.HI], nativeName: "Hindi" },
  { code: LANGUAGES.GU, name: LANGUAGE_NAMES[LANGUAGES.GU], nativeName: "Gujarati" },
];

function LanguageSelector({ currentLanguage, onLanguageChange, compact = false }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === currentLanguage) || LANGUAGE_OPTIONS[0];

  const handleSelect = useCallback(
    (langCode) => {
      onLanguageChange(langCode);
      setIsOpen(false);
    },
    [onLanguageChange]
  );

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t("common.selectLanguage")}
        id="language-selector"
      >
        <LanguageIcon className="h-4 w-4" aria-hidden="true" />
        {!compact && (
          <>
            <span className="hidden xs:inline">{currentOption.name}</span>
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </>
        )}
        {compact && <span className="uppercase text-xs">{currentOption.code}</span>}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none animate-fade-in"
          role="listbox"
          aria-label={t("common.selectLanguage")}
        >
          <div className="py-1">
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = option.code === currentLanguage;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => handleSelect(option.code)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                    ${
                      isSelected
                        ? "bg-primary-50 text-primary-700"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="flex flex-col items-start">
                    <span className="font-medium">{option.name}</span>
                    <span className="text-xs text-neutral-500">
                      {option.nativeName}
                    </span>
                  </span>
                  {isSelected && (
                    <CheckIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

LanguageSelector.propTypes = {
  currentLanguage: PropTypes.oneOf([LANGUAGES.EN, LANGUAGES.HI, LANGUAGES.GU]).isRequired,
  onLanguageChange: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};

export default LanguageSelector;
