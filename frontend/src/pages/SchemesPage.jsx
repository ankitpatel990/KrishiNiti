/**
 * SchemesPage - Government Schemes Information
 *
 * Displays all national and state-specific government schemes
 * with filtering, search, and detailed information.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { SchemeCard, SchemeDetails, SchemeFilters } from "@components/schemes";
import { LoadingSpinner, ErrorMessage, EmptyState } from "@components/common";
import { getAllSchemes } from "@services/schemesApi";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function SchemesPage() {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    scheme_type: "",
    state: "",
    is_active: true,
  });
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch schemes
  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getAllSchemes(filters);
        setSchemes(data.schemes || []);
      } catch (err) {
        console.error("Error fetching schemes:", err);
        setError(err.message || "Failed to load schemes. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, [filters]);

  // Filter schemes by search query
  const filteredSchemes = useMemo(() => {
    if (!searchQuery.trim()) return schemes;

    const query = searchQuery.toLowerCase();
    return schemes.filter(
      (scheme) =>
        scheme.scheme_name.toLowerCase().includes(query) ||
        scheme.scheme_name_hindi?.toLowerCase().includes(query) ||
        scheme.description.toLowerCase().includes(query) ||
        scheme.scheme_code.toLowerCase().includes(query)
    );
  }, [schemes, searchQuery]);

  // Categorize schemes
  const { nationalSchemes, stateSchemes } = useMemo(() => {
    const national = filteredSchemes.filter((s) => !s.state_specific);
    const state = filteredSchemes.filter((s) => s.state_specific);
    return { nationalSchemes: national, stateSchemes: state };
  }, [filteredSchemes]);

  const handleViewDetails = (scheme) => {
    setSelectedScheme(scheme);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setTimeout(() => setSelectedScheme(null), 300);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-neutral-900 mb-2">
          Government Schemes
        </h1>
        <p className="text-neutral-600 text-lg max-w-3xl">
          Explore national and state-specific schemes for farmers. Get complete information
          about benefits, eligibility, application process, and more.
        </p>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3"
      >
        <InformationCircleIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-900 font-medium mb-1">
            Complete Scheme Information Available
          </p>
          <p className="text-sm text-blue-700">
            All schemes include detailed eligibility criteria, required documents, application
            process, helpline numbers, and official application links.
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <div className="relative max-w-2xl">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemes by name, description, or code..."
            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <SchemeFilters filters={filters} onFilterChange={setFilters} />
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorMessage
          message={error}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Empty State */}
      {!loading && !error && filteredSchemes.length === 0 && (
        <EmptyState
          icon={<ExclamationTriangleIcon className="h-10 w-10" />}
          title="No schemes found"
          description="Try adjusting your filters or search query."
        />
      )}

      {/* Schemes List */}
      {!loading && !error && filteredSchemes.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* National Schemes */}
          {nationalSchemes.length > 0 && (
            <section>
              <motion.div variants={itemVariants} className="mb-4">
                <h2 className="text-2xl font-bold text-neutral-900 mb-1">
                  National Schemes
                  <span className="ml-2 text-lg font-normal text-neutral-600">
                    ({nationalSchemes.length})
                  </span>
                </h2>
                <p className="text-neutral-600">
                  Schemes available for farmers across all states in India
                </p>
              </motion.div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {nationalSchemes.map((scheme) => (
                  <SchemeCard
                    key={scheme.id}
                    scheme={scheme}
                    onViewDetails={() => handleViewDetails(scheme)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* State-Specific Schemes */}
          {stateSchemes.length > 0 && (
            <section>
              <motion.div variants={itemVariants} className="mb-4">
                <h2 className="text-2xl font-bold text-neutral-900 mb-1">
                  State-Specific Schemes
                  <span className="ml-2 text-lg font-normal text-neutral-600">
                    ({stateSchemes.length})
                  </span>
                </h2>
                <p className="text-neutral-600">
                  Schemes specific to certain states (currently showing Gujarat schemes)
                </p>
              </motion.div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stateSchemes.map((scheme) => (
                  <SchemeCard
                    key={scheme.id}
                    scheme={scheme}
                    onViewDetails={() => handleViewDetails(scheme)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Summary Stats */}
          <motion.div
            variants={itemVariants}
            className="bg-neutral-50 rounded-lg p-6 border border-neutral-200"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary-600">
                  {filteredSchemes.length}
                </p>
                <p className="text-sm text-neutral-600 mt-1">Total Schemes</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {nationalSchemes.length}
                </p>
                <p className="text-sm text-neutral-600 mt-1">National</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">
                  {stateSchemes.length}
                </p>
                <p className="text-sm text-neutral-600 mt-1">State-Specific</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">
                  {filteredSchemes.filter((s) => s.is_active).length}
                </p>
                <p className="text-sm text-neutral-600 mt-1">Active</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Scheme Details Modal */}
      <SchemeDetails
        scheme={selectedScheme}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  );
}

export default SchemesPage;
