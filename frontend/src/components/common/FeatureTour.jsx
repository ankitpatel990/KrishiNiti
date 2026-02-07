/**
 * FeatureTour - Interactive spotlight-based product tour.
 *
 * Highlights specific elements on the page by targeting them via
 * CSS selectors. Displays a tooltip with step information next to
 * each highlighted element. Supports next, back, and skip actions.
 *
 * Steps are provided as an array of { target, title, description, placement }.
 * The target is a CSS selector string pointing to the DOM element to highlight.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import PropTypes from "prop-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOOLTIP_OFFSET = 12;
const SPOTLIGHT_PADDING = 8;

const TOOLTIP_VARIANTS = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the tooltip position relative to the target rect.
 *
 * @param {DOMRect} targetRect  - Bounding rect of the target element.
 * @param {string}  placement   - One of: top, bottom, left, right.
 * @param {number}  tooltipWidth
 * @returns {{ top: number, left: number }}
 */
function computeTooltipPosition(targetRect, placement, tooltipWidth = 300) {
  const centerX = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  const clampedX = Math.max(16, Math.min(centerX, window.innerWidth - tooltipWidth - 16));

  switch (placement) {
    case "top":
      return {
        top: targetRect.top - TOOLTIP_OFFSET - 10,
        left: clampedX,
        transformOrigin: "bottom center",
      };
    case "left":
      return {
        top: targetRect.top + targetRect.height / 2 - 40,
        left: Math.max(16, targetRect.left - tooltipWidth - TOOLTIP_OFFSET),
        transformOrigin: "right center",
      };
    case "right":
      return {
        top: targetRect.top + targetRect.height / 2 - 40,
        left: targetRect.right + TOOLTIP_OFFSET,
        transformOrigin: "left center",
      };
    case "bottom":
    default:
      return {
        top: targetRect.bottom + TOOLTIP_OFFSET,
        left: clampedX,
        transformOrigin: "top center",
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FeatureTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  startAt = 0,
}) {
  const [currentStep, setCurrentStep] = useState(startAt);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // ---------------------------------------------------------------------------
  // Find and measure the target element
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen || !step?.target) {
      setTargetRect(null);
      return;
    }

    function measure() {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top - SPOTLIGHT_PADDING,
          left: rect.left - SPOTLIGHT_PADDING,
          width: rect.width + SPOTLIGHT_PADDING * 2,
          height: rect.height + SPOTLIGHT_PADDING * 2,
        });
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        setTargetRect(null);
      }
    }

    // Measure after a short delay to allow DOM to settle
    const timer = setTimeout(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isOpen, currentStep, step]);

  // Reset step when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(startAt);
    }
  }, [isOpen, startAt]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete?.();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLast, onClose, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirst]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e) {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isOpen || !step) return null;

  const placement = step.placement || "bottom";
  const tooltipPos = targetRect
    ? computeTooltipPosition(targetRect, placement)
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark overlay */}
          <div
            className="fixed inset-0 z-[9997] bg-black/60 transition-opacity duration-300"
            onClick={handleSkip}
            aria-hidden="true"
          />

          {/* Spotlight cutout */}
          {targetRect && (
            <div
              className="tour-spotlight"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            variants={TOOLTIP_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed z-[9999] w-[300px] rounded-xl bg-white shadow-float overflow-hidden"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              transformOrigin: tooltipPos.transformOrigin,
            }}
            role="dialog"
            aria-label={step.title}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
              <span className="text-xs font-medium opacity-80">
                {currentStep + 1} / {steps.length}
              </span>
              <button
                type="button"
                onClick={handleSkip}
                className="p-1 rounded-md hover:bg-primary-500 transition-colors"
                aria-label="Skip tour"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                {step.title}
              </h4>
              <p className="text-sm text-neutral-600 leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 bg-neutral-50">
              <button
                type="button"
                onClick={handlePrev}
                disabled={isFirst}
                className={[
                  "flex items-center gap-1 text-sm font-medium transition-colors",
                  isFirst
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-neutral-600 hover:text-neutral-800",
                ].join(" ")}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                {isLast ? "Done" : "Next"}
                {!isLast && <ChevronRightIcon className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

FeatureTour.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      target: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      placement: PropTypes.oneOf(["top", "bottom", "left", "right"]),
    }),
  ).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
  startAt: PropTypes.number,
};

export default FeatureTour;
