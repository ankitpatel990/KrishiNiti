/**
 * FilterPanel - State, district, and sort filters for mandi prices.
 *
 * Features:
 *  - State filter dropdown (derived from price data)
 *  - District filter dropdown (cascades from state)
 *  - Sort selector (price asc/desc, name, date)
 *  - Clear filters button
 *  - Collapsible on mobile
 */

import { useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Select, Button, Badge } from "@components/common";

const SORT_OPTIONS = [
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "name_asc", label: "Mandi Name: A-Z" },
  { value: "date_desc", label: "Date: Newest First" },
];

function FilterPanel({
  prices = [],
  filters,
  onFiltersChange,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derive unique states from price data
  const stateOptions = useMemo(() => {
    const states = [...new Set(prices.map((p) => p.state).filter(Boolean))].sort();
    return states.map((s) => ({ value: s, label: s }));
  }, [prices]);

  // Derive districts filtered by selected state
  const districtOptions = useMemo(() => {
    const filtered = filters.state
      ? prices.filter((p) => p.state === filters.state)
      : prices;
    const districts = [
      ...new Set(filtered.map((p) => p.district).filter(Boolean)),
    ].sort();
    return districts.map((d) => ({ value: d, label: d }));
  }, [prices, filters.state]);

  const activeFilterCount = [filters.state, filters.district].filter(
    Boolean,
  ).length;

  const handleStateChange = useCallback(
    (e) => {
      onFiltersChange({
        ...filters,
        state: e.target.value,
        district: "", // Reset district when state changes
      });
    },
    [filters, onFiltersChange],
  );

  const handleDistrictChange = useCallback(
    (e) => {
      onFiltersChange({ ...filters, district: e.target.value });
    },
    [filters, onFiltersChange],
  );

  const handleSortChange = useCallback(
    (e) => {
      onFiltersChange({ ...filters, sort: e.target.value });
    },
    [filters, onFiltersChange],
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({ state: "", district: "", sort: "price_desc" });
  }, [onFiltersChange]);

  return (
    <div className={className}>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors sm:hidden"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4" aria-hidden="true" />
          Filters & Sort
          {activeFilterCount > 0 && (
            <Badge variant="primary" size="sm">
              {activeFilterCount}
            </Badge>
          )}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Filter panel (always visible on desktop, collapsible on mobile) */}
      <div className={`${isExpanded ? "block" : "hidden"} sm:block mt-3 sm:mt-0`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          {/* State filter */}
          <Select
            name="state-filter"
            label="State"
            options={stateOptions}
            value={filters.state}
            onChange={handleStateChange}
            placeholder="All States"
            className="sm:w-44"
          />

          {/* District filter */}
          <Select
            name="district-filter"
            label="District"
            options={districtOptions}
            value={filters.district}
            onChange={handleDistrictChange}
            placeholder="All Districts"
            disabled={!filters.state}
            className="sm:w-44"
          />

          {/* Sort */}
          <Select
            name="sort-option"
            label="Sort By"
            options={SORT_OPTIONS}
            value={filters.sort}
            onChange={handleSortChange}
            className="sm:w-48"
          />

          {/* Clear */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              icon={<XMarkIcon className="h-4 w-4" />}
              className="sm:mb-0.5"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

FilterPanel.propTypes = {
  prices: PropTypes.array,
  filters: PropTypes.shape({
    state: PropTypes.string,
    district: PropTypes.string,
    sort: PropTypes.string,
  }).isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default FilterPanel;
