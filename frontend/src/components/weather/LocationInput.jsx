/**
 * LocationInput - Pincode entry with geolocation auto-detect and recent history.
 *
 * Features:
 *  - 6-digit pincode input with client-side validation
 *  - Browser geolocation "Detect my location" button
 *  - Recent pincodes stored in localStorage (up to 5)
 *  - Integrated with LocationContext for global state
 */

import { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, Input } from "@components/common";
import { validatePincode } from "@utils/validators";
import storage from "@utils/storage";

const RECENT_PINCODES_KEY = "farmhelp_recent_pincodes";
const MAX_RECENT = 5;

function getRecentPincodes() {
  return storage.get(RECENT_PINCODES_KEY, []);
}

function saveRecentPincode(pincode) {
  const recent = getRecentPincodes().filter((p) => p !== pincode);
  recent.unshift(pincode);
  storage.set(RECENT_PINCODES_KEY, recent.slice(0, MAX_RECENT));
}

function LocationInput({
  onSubmit,
  initialPincode = "",
  loading = false,
  detectingLocation = false,
  onDetectLocation,
}) {
  const [pincode, setPincode] = useState(initialPincode);
  const [error, setError] = useState("");
  const [showRecent, setShowRecent] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const recentPincodes = getRecentPincodes();

  // Sync initial pincode when prop changes
  useEffect(() => {
    if (initialPincode && initialPincode !== pincode) {
      setPincode(initialPincode);
    }
    // Only run when initialPincode changes externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPincode]);

  // Close recent dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowRecent(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = useCallback((e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(val);
    setError("");
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      if (e) e.preventDefault();
      const result = validatePincode(pincode);
      if (!result.valid) {
        setError(result.message);
        return;
      }
      setError("");
      saveRecentPincode(pincode);
      setShowRecent(false);
      onSubmit(pincode);
    },
    [pincode, onSubmit],
  );

  const handleRecentSelect = useCallback(
    (selectedPincode) => {
      setPincode(selectedPincode);
      setError("");
      setShowRecent(false);
      saveRecentPincode(selectedPincode);
      onSubmit(selectedPincode);
    },
    [onSubmit],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFocus = useCallback(() => {
    if (recentPincodes.length > 0) {
      setShowRecent(true);
    }
  }, [recentPincodes.length]);

  return (
    <div ref={containerRef} className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Pincode input */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            name="pincode"
            type="text"
            inputMode="numeric"
            label="Pincode"
            placeholder="Enter 6-digit pincode"
            value={pincode}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            error={error}
            disabled={loading}
            leadingIcon={<MapPinIcon className="h-4 w-4" />}
            helperText="Example: 110001 (New Delhi), 400001 (Mumbai)"
          />

          {/* Recent pincodes dropdown */}
          {showRecent && recentPincodes.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Recent Pincodes
                </span>
                <button
                  type="button"
                  onClick={() => setShowRecent(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                  aria-label="Close recent pincodes"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <ul className="py-1">
                {recentPincodes.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => handleRecentSelect(p)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                    >
                      <MapPinIcon className="h-4 w-4 text-neutral-400" />
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 sm:pb-5">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={pincode.length !== 6}
            icon={<MagnifyingGlassIcon className="h-4 w-4" />}
          >
            Get Forecast
          </Button>

          {onDetectLocation && (
            <Button
              type="button"
              variant="outline"
              size="md"
              loading={detectingLocation}
              onClick={onDetectLocation}
              icon={<MapPinIcon className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Detect Location</span>
              <span className="sm:hidden">Detect</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

LocationInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialPincode: PropTypes.string,
  loading: PropTypes.bool,
  detectingLocation: PropTypes.bool,
  onDetectLocation: PropTypes.func,
};

export default LocationInput;
