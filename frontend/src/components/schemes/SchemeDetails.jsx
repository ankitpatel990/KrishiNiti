/**
 * SchemeDetails Component
 *
 * Modal displaying comprehensive details of a government scheme.
 */

import PropTypes from "prop-types";
import {
  XMarkIcon,
  BanknotesIcon,
  DocumentTextIcon,
  PhoneIcon,
  CalendarIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Modal } from "@components/common";

function SchemeDetails({ scheme, isOpen, onClose }) {
  if (!scheme) return null;

  const handleApplyClick = () => {
    if (scheme.application_url) {
      window.open(scheme.application_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">
              {scheme.scheme_name}
            </h2>
            {scheme.scheme_name_hindi && (
              <p className="text-lg text-neutral-600">{scheme.scheme_name_hindi}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Description */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <InformationCircleIcon className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-neutral-900">Description</h3>
            </div>
            <p className="text-neutral-700 leading-relaxed">{scheme.description}</p>
            {scheme.description_hindi && (
              <p className="text-neutral-600 leading-relaxed mt-2 text-sm">
                {scheme.description_hindi}
              </p>
            )}
          </section>

          {/* Benefit Amount */}
          {scheme.benefit_amount && (
            <section className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Benefit Amount</h3>
              </div>
              <p className="text-xl font-bold text-green-700">{scheme.benefit_amount}</p>
            </section>
          )}

          {/* Eligibility Criteria */}
          {scheme.eligibility_criteria && Object.keys(scheme.eligibility_criteria).length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Eligibility Criteria</h3>
              </div>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                {Object.entries(scheme.eligibility_criteria).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-primary-600 mt-1">•</span>
                    <div className="flex-1">
                      <span className="font-medium text-neutral-900 capitalize">
                        {key.replace(/_/g, " ")}:
                      </span>{" "}
                      <span className="text-neutral-700">
                        {typeof value === "object" ? JSON.stringify(value) : value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Required Documents */}
          {scheme.required_documents && scheme.required_documents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <DocumentTextIcon className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Required Documents</h3>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {scheme.required_documents.map((doc, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg"
                  >
                    <ClipboardDocumentListIcon className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="text-sm text-neutral-700">{doc}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Application Process */}
          {scheme.application_process && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <GlobeAltIcon className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Application Process</h3>
              </div>
              <p className="text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-lg">
                {scheme.application_process}
              </p>
            </section>
          )}

          {/* Key Features */}
          {scheme.key_features && scheme.key_features.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-neutral-900">Key Features</h3>
              </div>
              <ul className="space-y-2">
                {scheme.key_features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary-600 mt-1">✓</span>
                    <span className="text-sm text-neutral-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Contact Information */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheme.helpline_number && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <PhoneIcon className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Helpline</h4>
                </div>
                <p className="text-blue-700 font-medium">{scheme.helpline_number}</p>
              </div>
            )}

            {scheme.deadline_type && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-5 w-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Deadline</h4>
                </div>
                <p className="text-amber-700 font-medium">
                  {scheme.deadline_date || scheme.deadline_type}
                </p>
              </div>
            )}
          </section>

          {/* Last Updated */}
          {scheme.last_updated && (
            <p className="text-xs text-neutral-500 text-center">
              Last updated: {scheme.last_updated}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Close
          </button>
          {scheme.application_url && (
            <button
              onClick={handleApplyClick}
              className="flex-1 px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <GlobeAltIcon className="h-5 w-5" />
              Apply Online
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

SchemeDetails.propTypes = {
  scheme: PropTypes.shape({
    scheme_name: PropTypes.string.isRequired,
    scheme_name_hindi: PropTypes.string,
    description: PropTypes.string.isRequired,
    description_hindi: PropTypes.string,
    benefit_amount: PropTypes.string,
    eligibility_criteria: PropTypes.object,
    required_documents: PropTypes.arrayOf(PropTypes.string),
    application_process: PropTypes.string,
    application_url: PropTypes.string,
    helpline_number: PropTypes.string,
    deadline_type: PropTypes.string,
    deadline_date: PropTypes.string,
    key_features: PropTypes.arrayOf(PropTypes.string),
    last_updated: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SchemeDetails;
