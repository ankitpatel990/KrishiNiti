/**
 * LocationInput - Cascading State / District / Taluka dropdowns.
 *
 * Flow:
 *  1. User selects a State  (all Indian states listed).
 *  2. User selects a District. Only Gujarat districts with data are
 *     selectable; all other states show "Coming Soon" in the dropdown.
 *  3. User selects a Taluka from the available list for that district.
 *  4. On submit, the selected { state, district, taluka } is passed
 *     to the parent via onSubmit.
 */

import { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  MapPinIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Button, Select } from "@components/common";

// ---------------------------------------------------------------------------
// All Indian states (alphabetical)
// ---------------------------------------------------------------------------
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// ---------------------------------------------------------------------------
// Hardcoded location hierarchy (mirrors backend taluka_coordinates.json)
// ---------------------------------------------------------------------------
const LOCATION_DATA = {
  Gujarat: {
    Rajkot: ["Jetpur", "Gondal"],
    Junagadh: ["Keshod", "Vanthli"],
    Amreli: ["Lathi", "Dhari"],
  },
};

const ACTIVE_STATE = "Gujarat";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function LocationInput({ onSubmit, initialLocation, loading }) {
  const [selectedState, setSelectedState] = useState(
    initialLocation?.state || "",
  );
  const [selectedDistrict, setSelectedDistrict] = useState(
    initialLocation?.district || "",
  );
  const [selectedTaluka, setSelectedTaluka] = useState(
    initialLocation?.taluka || "",
  );

  // -- Derived option lists -------------------------------------------------

  const stateOptions = useMemo(
    () =>
      INDIAN_STATES.map((s) => ({
        value: s,
        label: s,
      })),
    [],
  );

  const isActiveState = selectedState === ACTIVE_STATE;

  const districtOptions = useMemo(() => {
    if (!selectedState) return [];
    if (!isActiveState) {
      return [{ value: "__coming_soon__", label: "Coming Soon", disabled: true }];
    }
    const districts = LOCATION_DATA[ACTIVE_STATE];
    return Object.keys(districts)
      .sort()
      .map((d) => ({ value: d, label: d }));
  }, [selectedState, isActiveState]);

  const talukaOptions = useMemo(() => {
    if (!isActiveState || !selectedDistrict) return [];
    const talukas = LOCATION_DATA[ACTIVE_STATE]?.[selectedDistrict];
    if (!talukas) return [];
    return talukas.map((t) => ({ value: t, label: t }));
  }, [isActiveState, selectedDistrict]);

  // -- Handlers -------------------------------------------------------------

  const handleStateChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedState(value);
    setSelectedDistrict("");
    setSelectedTaluka("");
  }, []);

  const handleDistrictChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedDistrict(value);
    setSelectedTaluka("");
  }, []);

  const handleTalukaChange = useCallback((e) => {
    setSelectedTaluka(e.target.value);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      if (e) e.preventDefault();
      if (!selectedState || !selectedDistrict || !selectedTaluka) return;
      onSubmit({
        state: selectedState,
        district: selectedDistrict,
        taluka: selectedTaluka,
      });
    },
    [selectedState, selectedDistrict, selectedTaluka, onSubmit],
  );

  const canSubmit =
    isActiveState && selectedDistrict && selectedTaluka && !loading;

  // -- Render ---------------------------------------------------------------

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Dropdown row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* State */}
          <Select
            name="state"
            label="State"
            options={stateOptions}
            value={selectedState}
            onChange={handleStateChange}
            placeholder="Select State"
            disabled={loading}
            searchable
          />

          {/* District */}
          <Select
            name="district"
            label="District"
            options={districtOptions}
            value={selectedDistrict}
            onChange={handleDistrictChange}
            placeholder={
              selectedState
                ? isActiveState
                  ? "Select District"
                  : "Coming Soon"
                : "Select State first"
            }
            disabled={loading || !selectedState || !isActiveState}
          />

          {/* Taluka */}
          <Select
            name="taluka"
            label="Taluka"
            options={talukaOptions}
            value={selectedTaluka}
            onChange={handleTalukaChange}
            placeholder={
              selectedDistrict ? "Select Taluka" : "Select District first"
            }
            disabled={loading || !selectedDistrict}
          />
        </div>

        {/* Info message for non-Gujarat states */}
        {selectedState && !isActiveState && (
          <p className="text-sm text-amber-600">
            Weather data for {selectedState} is coming soon. Currently only
            select districts of Gujarat are supported.
          </p>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={!canSubmit}
            icon={<MagnifyingGlassIcon className="h-4 w-4" />}
          >
            Get Forecast
          </Button>

          {selectedTaluka && selectedDistrict && selectedState && (
            <span className="flex items-center gap-1.5 text-sm text-neutral-600">
              <MapPinIcon className="h-4 w-4 text-neutral-400" />
              {selectedTaluka}, {selectedDistrict}, {selectedState}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

LocationInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialLocation: PropTypes.shape({
    state: PropTypes.string,
    district: PropTypes.string,
    taluka: PropTypes.string,
  }),
  loading: PropTypes.bool,
};

LocationInput.defaultProps = {
  initialLocation: null,
  loading: false,
};

export default LocationInput;
