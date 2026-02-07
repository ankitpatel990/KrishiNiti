/**
 * TreatmentCard - Comprehensive disease treatment display.
 *
 * Sections:
 *  - Chemical treatment with dosage
 *  - Organic / natural treatment
 *  - Cost estimation per acre
 *  - Prevention tips
 *  - Application instructions
 *
 * Uses Tabs to separate chemical and organic treatments.
 */

import PropTypes from "prop-types";
import {
  BeakerIcon,
  SparklesIcon,
  CurrencyRupeeIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Card, Badge, Tabs } from "@components/common";
import { formatPrice } from "@utils/helpers";

/**
 * Render a labelled detail row.
 */
function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <div className="mt-0.5 text-sm text-neutral-700">{children}</div>
      </div>
    </div>
  );
}

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function TreatmentCard({ treatment, className = "" }) {
  if (!treatment) {
    return null;
  }

  const {
    treatment_chemical,
    treatment_organic,
    dosage,
    cost_per_acre,
    prevention_tips,
  } = treatment;

  const preventionList = prevention_tips
    ? prevention_tips.split(/,\s*/).filter(Boolean)
    : [];

  // Build tabs for chemical vs organic treatment
  const treatmentTabs = [];

  if (treatment_chemical) {
    treatmentTabs.push({
      id: "chemical",
      label: "Chemical",
      icon: <BeakerIcon className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-neutral-700 leading-relaxed">
            {treatment_chemical}
          </p>

          {dosage && (
            <DetailRow icon={InformationCircleIcon} label="Dosage & Application">
              <p className="leading-relaxed">{dosage}</p>
            </DetailRow>
          )}
        </div>
      ),
    });
  }

  if (treatment_organic) {
    treatmentTabs.push({
      id: "organic",
      label: "Organic",
      icon: <SparklesIcon className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-neutral-700 leading-relaxed">
            {treatment_organic}
          </p>
        </div>
      ),
    });
  }

  return (
    <Card
      variant="default"
      className={className}
      header={
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">
            Treatment Plan
          </h3>
          {cost_per_acre != null && (
            <Badge variant="secondary" size="md">
              <CurrencyRupeeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {formatPrice(cost_per_acre, 0)}/acre
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Treatment tabs */}
        {treatmentTabs.length > 0 && <Tabs tabs={treatmentTabs} />}

        {/* Estimated cost callout */}
        {cost_per_acre != null && (
          <div className="rounded-lg bg-secondary-50 border border-secondary-200 px-4 py-3">
            <DetailRow icon={CurrencyRupeeIcon} label="Estimated Cost">
              <span className="font-semibold text-secondary-800">
                {formatPrice(cost_per_acre, 0)} per acre
              </span>
              <span className="block text-xs text-neutral-500 mt-0.5">
                Approximate cost including chemicals and labour
              </span>
            </DetailRow>
          </div>
        )}

        {/* Prevention tips */}
        {preventionList.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-sm font-medium text-neutral-700">
              <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
              Prevention Tips
            </h4>
            <ul className="grid gap-2 sm:grid-cols-2">
              {preventionList.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-neutral-600"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400"
                    aria-hidden="true"
                  />
                  <span>{tip.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

TreatmentCard.propTypes = {
  treatment: PropTypes.shape({
    treatment_chemical: PropTypes.string,
    treatment_organic: PropTypes.string,
    dosage: PropTypes.string,
    cost_per_acre: PropTypes.number,
    prevention_tips: PropTypes.string,
  }),
  className: PropTypes.string,
};

export default TreatmentCard;
