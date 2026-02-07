/**
 * SchemeFilters Component
 *
 * Filter controls for government schemes.
 */

import PropTypes from "prop-types";
import { FunnelIcon } from "@heroicons/react/24/outline";

const SCHEME_TYPES = [
  { value: "", label: "All Types" },
  { value: "direct_benefit", label: "Direct Benefit" },
  { value: "subsidy", label: "Subsidy" },
  { value: "insurance", label: "Insurance" },
  { value: "credit", label: "Credit" },
  { value: "price_support", label: "Price Support" },
  { value: "market_access", label: "Market Access" },
  { value: "electricity", label: "Electricity" },
];

const STATES = [
  { value: "", label: "All States" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Punjab", label: "Punjab" },
  { value: "Haryana", label: "Haryana" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Rajasthan", label: "Rajasthan" },
];

function SchemeFilters({ filters, onFilterChange }) {
  const handleTypeChange = (e) => {
    onFilterChange({ ...filters, scheme_type: e.target.value });
  };

  const handleStateChange = (e) => {
    onFilterChange({ ...filters, state: e.target.value });
  };

  const handleReset = () => {
    onFilterChange({ scheme_type: "", state: "", is_active: true });
  };

  const hasActiveFilters = filters.scheme_type || filters.state;

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FunnelIcon className="h-5 w-5 text-neutral-600" />
        <h3 className="text-lg font-semibold text-neutral-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="ml-auto text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scheme Type Filter */}
        <div>
          <label
            htmlFor="scheme-type"
            className="block text-sm font-medium text-neutral-700 mb-2"
          >
            Scheme Type
          </label>
          <select
            id="scheme-type"
            value={filters.scheme_type}
            onChange={handleTypeChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {SCHEME_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-neutral-700 mb-2"
          >
            State
          </label>
          <select
            id="state"
            value={filters.state}
            onChange={handleStateChange}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Count */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            {[filters.scheme_type, filters.state].filter(Boolean).length} filter(s) active
          </p>
        </div>
      )}
    </div>
  );
}

SchemeFilters.propTypes = {
  filters: PropTypes.shape({
    scheme_type: PropTypes.string,
    state: PropTypes.string,
    is_active: PropTypes.bool,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default SchemeFilters;
