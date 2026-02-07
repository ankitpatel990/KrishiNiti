/**
 * SchemeCard Component
 *
 * Displays a government scheme in a card format with all key information.
 */

import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  BanknotesIcon,
  DocumentTextIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@components/common";

const SCHEME_TYPE_COLORS = {
  direct_benefit: "bg-green-50 text-green-700 border-green-200",
  subsidy: "bg-blue-50 text-blue-700 border-blue-200",
  insurance: "bg-purple-50 text-purple-700 border-purple-200",
  credit: "bg-orange-50 text-orange-700 border-orange-200",
  price_support: "bg-yellow-50 text-yellow-700 border-yellow-200",
  market_access: "bg-indigo-50 text-indigo-700 border-indigo-200",
  electricity: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const SCHEME_TYPE_LABELS = {
  direct_benefit: "Direct Benefit",
  subsidy: "Subsidy",
  insurance: "Insurance",
  credit: "Credit",
  price_support: "Price Support",
  market_access: "Market Access",
  electricity: "Electricity",
};

function SchemeCard({ scheme, onViewDetails }) {
  const typeColor = SCHEME_TYPE_COLORS[scheme.scheme_type] || "bg-neutral-50 text-neutral-700 border-neutral-200";
  const typeLabel = SCHEME_TYPE_LABELS[scheme.scheme_type] || scheme.scheme_type;

  const handleApplyClick = () => {
    if (scheme.application_url) {
      window.open(scheme.application_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1 line-clamp-2">
              {scheme.scheme_name}
            </h3>
            {scheme.scheme_name_hindi && (
              <p className="text-sm text-neutral-600 mb-2 line-clamp-1">
                {scheme.scheme_name_hindi}
              </p>
            )}
          </div>
          {scheme.state_specific && (
            <span className="ml-2 shrink-0 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-md">
              State Scheme
            </span>
          )}
        </div>

        {/* Type Badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${typeColor}`}>
            {typeLabel}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-neutral-700 mb-4 line-clamp-3 flex-grow">
          {scheme.description}
        </p>

        {/* Benefit Amount */}
        {scheme.benefit_amount && (
          <div className="flex items-start gap-2 mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <BanknotesIcon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-900 mb-0.5">Benefit Amount</p>
              <p className="text-sm font-semibold text-green-700">
                {scheme.benefit_amount}
              </p>
            </div>
          </div>
        )}

        {/* Key Info Grid */}
        <div className="space-y-2 mb-4">
          {/* Deadline */}
          {scheme.deadline_type && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-neutral-500 shrink-0" />
              <span className="text-neutral-600">
                <span className="font-medium">Deadline:</span>{" "}
                {scheme.deadline_date || scheme.deadline_type}
              </span>
            </div>
          )}

          {/* Helpline */}
          {scheme.helpline_number && (
            <div className="flex items-center gap-2 text-sm">
              <PhoneIcon className="h-4 w-4 text-neutral-500 shrink-0" />
              <span className="text-neutral-600">
                <span className="font-medium">Helpline:</span>{" "}
                {scheme.helpline_number}
              </span>
            </div>
          )}

          {/* Documents Count */}
          {scheme.required_documents && scheme.required_documents.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <DocumentTextIcon className="h-4 w-4 text-neutral-500 shrink-0" />
              <span className="text-neutral-600">
                <span className="font-medium">Documents:</span>{" "}
                {scheme.required_documents.length} required
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-neutral-100">
          <button
            onClick={onViewDetails}
            className="flex-1 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
          >
            <InformationCircleIcon className="h-4 w-4" />
            View Details
          </button>
          {scheme.application_url && (
            <button
              onClick={handleApplyClick}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <GlobeAltIcon className="h-4 w-4" />
              Apply Now
            </button>
          )}
        </div>

        {/* Active Status Indicator */}
        {scheme.is_active && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Active Scheme</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

SchemeCard.propTypes = {
  scheme: PropTypes.shape({
    id: PropTypes.number.isRequired,
    scheme_code: PropTypes.string.isRequired,
    scheme_name: PropTypes.string.isRequired,
    scheme_name_hindi: PropTypes.string,
    scheme_type: PropTypes.string.isRequired,
    state_specific: PropTypes.bool,
    description: PropTypes.string.isRequired,
    benefit_amount: PropTypes.string,
    deadline_type: PropTypes.string,
    deadline_date: PropTypes.string,
    helpline_number: PropTypes.string,
    required_documents: PropTypes.arrayOf(PropTypes.string),
    application_url: PropTypes.string,
    is_active: PropTypes.bool,
  }).isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default SchemeCard;
