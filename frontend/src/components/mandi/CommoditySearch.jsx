/**
 * CommoditySearch - Commodity selection with search, recent history, and quick picks.
 *
 * Features:
 *  - Searchable dropdown for commodity selection
 *  - Recent searches stored in localStorage (up to 5)
 *  - Popular commodities quick-select chips
 */

import { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  MagnifyingGlassIcon,
  ClockIcon,
  XMarkIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import storage from "@utils/storage";

const RECENT_KEY = "farmhelp_recent_commodities";
const MAX_RECENT = 5;

const POPULAR_COMMODITIES = [
  "Wheat",
  "Rice",
  "Cotton",
  "Onion",
  "Potato",
  "Tomato",
  "Sugarcane",
  "Soybean",
];

function getRecentCommodities() {
  return storage.get(RECENT_KEY, []);
}

function saveRecentCommodity(commodity) {
  const recent = getRecentCommodities().filter((c) => c !== commodity);
  recent.unshift(commodity);
  storage.set(RECENT_KEY, recent.slice(0, MAX_RECENT));
}

function CommoditySearch({
  commodities = [],
  value = "",
  onSelect,
  loading = false,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const recentCommodities = getRecentCommodities();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build commodity names from the list or use popular as fallback
  const commodityNames = commodities.length > 0
    ? commodities.map((c) => (typeof c === "string" ? c : c.commodity || c.name))
    : POPULAR_COMMODITIES;

  const filtered = query
    ? commodityNames.filter((name) =>
        name.toLowerCase().includes(query.toLowerCase()),
      )
    : commodityNames;

  const handleSelect = useCallback(
    (commodity) => {
      saveRecentCommodity(commodity);
      setQuery("");
      setIsOpen(false);
      onSelect(commodity);
    },
    [onSelect],
  );

  const handleInputChange = useCallback((e) => {
    setQuery(e.target.value);
    setIsOpen(true);
  }, []);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && filtered.length > 0) {
        handleSelect(filtered[0]);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [filtered, handleSelect],
  );

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div ref={containerRef} className="relative">
        <label
          htmlFor="commodity-search"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Select Commodity
        </label>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            <MagnifyingGlassIcon className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            id="commodity-search"
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={value || "Search commodity (e.g. Wheat, Rice)"}
            disabled={loading}
            autoComplete="off"
            className={[
              "block w-full rounded-lg border px-3 py-2 pl-10 text-sm text-neutral-900",
              "placeholder:text-neutral-400",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "border-neutral-300",
              "disabled:bg-neutral-100 disabled:cursor-not-allowed",
            ].join(" ")}
          />
          {value && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                {value}
              </span>
            </div>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg max-h-64 overflow-hidden">
            {/* Recent searches */}
            {!query && recentCommodities.length > 0 && (
              <div className="border-b border-neutral-100">
                <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-500">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Recent
                </div>
                <ul>
                  {recentCommodities.map((c) => (
                    <li key={`recent-${c}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c)}
                        className={[
                          "flex w-full items-center gap-2 px-3 py-2 text-sm",
                          "hover:bg-primary-50 hover:text-primary-700 transition-colors",
                          c === value
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-neutral-700",
                        ].join(" ")}
                      >
                        <ClockIcon className="h-3.5 w-3.5 text-neutral-400" />
                        {c}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Filtered list */}
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-sm text-neutral-500 text-center">
                  No commodities found
                </li>
              )}
              {filtered.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => handleSelect(name)}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-sm",
                      "hover:bg-primary-50 hover:text-primary-700 transition-colors",
                      name === value
                        ? "bg-primary-50 text-primary-700 font-medium"
                        : "text-neutral-700",
                    ].join(" ")}
                  >
                    <TagIcon className="h-3.5 w-3.5 text-neutral-400" />
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Popular commodities quick-select */}
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-1.5">
          Popular Commodities
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_COMMODITIES.map((commodity) => (
            <button
              key={commodity}
              type="button"
              onClick={() => handleSelect(commodity)}
              disabled={loading}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                "border",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                commodity === value
                  ? "bg-secondary-100 border-secondary-300 text-secondary-800"
                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-secondary-50 hover:border-secondary-300 hover:text-secondary-700",
              ].join(" ")}
            >
              {commodity}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

CommoditySearch.propTypes = {
  commodities: PropTypes.array,
  value: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default CommoditySearch;
