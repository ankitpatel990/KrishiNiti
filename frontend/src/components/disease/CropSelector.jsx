/**
 * CropSelector - Grid of selectable crop cards for AI detection.
 *
 * Displays supported crops fetched from the backend and allows
 * the user to pick which crop they are uploading an image for.
 */

import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { getSupportedCrops } from "@services/diseaseApi";
import { Card, LoadingSpinner } from "@components/common";

const CROP_ICONS = {
  Paddy: "rice",
  Wheat: "wheat",
  Potato: "potato",
  Corn: "corn",
  Tomato: "tomato",
  Apple: "apple",
  Grape: "grape",
  Cherry: "cherry",
  Peach: "peach",
  "Bell Pepper": "pepper",
  Orange: "orange",
  Strawberry: "strawberry",
  Soybean: "soybean",
  Squash: "squash",
  Blueberry: "blueberry",
  Raspberry: "raspberry",
};

const CROP_EMOJIS = {
  Paddy: "\uD83C\uDF3E",
  Wheat: "\uD83C\uDF3E",
  Potato: "\uD83E\uDD54",
  Corn: "\uD83C\uDF3D",
  Tomato: "\uD83C\uDF45",
  Apple: "\uD83C\uDF4E",
  Grape: "\uD83C\uDF47",
  Cherry: "\uD83C\uDF52",
  Peach: "\uD83C\uDF51",
  "Bell Pepper": "\uD83C\uDF36\uFE0F",
  Orange: "\uD83C\uDF4A",
  Strawberry: "\uD83C\uDF53",
  Soybean: "\uD83C\uDF31",
  Squash: "\uD83C\uDF83",
  Blueberry: "\uD83E\uDED0",
  Raspberry: "\uD83E\uDED0",
};

function CropSelector({ selectedCrop, onCropSelect, disabled = false }) {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCrops() {
      try {
        setLoading(true);
        setError(null);
        const response = await getSupportedCrops();
        if (!cancelled) {
          setCrops(response.crops || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load supported crops. Please refresh.");
          setCrops(FALLBACK_CROPS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCrops();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = useCallback(
    (cropValue) => {
      if (!disabled) {
        onCropSelect(cropValue === selectedCrop ? null : cropValue);
      }
    },
    [disabled, selectedCrop, onCropSelect],
  );

  if (loading) {
    return (
      <Card variant="flat" className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
        <p className="ml-3 text-sm text-neutral-500">Loading supported crops...</p>
      </Card>
    );
  }

  if (error && crops.length === 0) {
    return (
      <Card variant="flat" className="py-6 text-center">
        <p className="text-sm text-danger-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-700">
        Select your crop type
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {crops.map((crop) => {
          const isSelected = selectedCrop === crop.value;
          const emoji = CROP_EMOJIS[crop.value] || "\uD83C\uDF3F";

          return (
            <motion.button
              key={crop.value}
              type="button"
              whileHover={{ scale: disabled ? 1 : 1.03 }}
              whileTap={{ scale: disabled ? 1 : 0.97 }}
              onClick={() => handleSelect(crop.value)}
              disabled={disabled}
              className={[
                "relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3",
                "text-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                isSelected
                  ? "border-primary-500 bg-primary-50 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/30",
              ].join(" ")}
              aria-pressed={isSelected}
              aria-label={`Select ${crop.label}`}
            >
              {isSelected && (
                <CheckCircleIcon
                  className="absolute top-1.5 right-1.5 h-4 w-4 text-primary-600"
                  aria-hidden="true"
                />
              )}
              <span className="text-2xl" role="img" aria-hidden="true">
                {emoji}
              </span>
              <span
                className={[
                  "text-xs font-medium leading-tight",
                  isSelected ? "text-primary-800" : "text-neutral-700",
                ].join(" ")}
              >
                {crop.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const FALLBACK_CROPS = [
  { value: "Paddy", label: "Paddy (Rice)", model: "vit" },
  { value: "Wheat", label: "Wheat", model: "vit" },
  { value: "Potato", label: "Potato", model: "vit" },
  { value: "Corn", label: "Corn (Maize)", model: "mobilenet" },
  { value: "Tomato", label: "Tomato", model: "mobilenet" },
  { value: "Apple", label: "Apple", model: "mobilenet" },
];

CropSelector.propTypes = {
  selectedCrop: PropTypes.string,
  onCropSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default CropSelector;
