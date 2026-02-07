/**
 * Accordion - Collapsible content sections.
 *
 * Supports single-open and multi-open modes.
 * Animated with framer-motion for smooth expand/collapse.
 * Fully keyboard accessible.
 */

import { useState, useCallback } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used via <motion.div>
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const PANEL_VARIANTS = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1 },
};

function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className = "",
}) {
  const [openItems, setOpenItems] = useState(new Set(defaultOpen));

  const toggleItem = useCallback(
    (itemId) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          if (!allowMultiple) {
            next.clear();
          }
          next.add(itemId);
        }
        return next;
      });
    },
    [allowMultiple],
  );

  return (
    <div
      className={`divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden ${className}`}
    >
      {items.map((item) => {
        const isOpen = openItems.has(item.id);

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.id}`}
              id={`accordion-header-${item.id}`}
              disabled={item.disabled}
              className={[
                "flex w-full items-center justify-between px-5 py-4 text-left",
                "text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isOpen
                  ? "bg-neutral-50 text-neutral-900"
                  : "bg-white text-neutral-700 hover:bg-neutral-50",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {item.icon && (
                  <span className="shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {item.title}
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`accordion-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`accordion-header-${item.id}`}
                  variants={PANEL_VARIANTS}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 py-4 text-sm text-neutral-600 bg-white">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

Accordion.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.node.isRequired,
      content: PropTypes.node.isRequired,
      icon: PropTypes.node,
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  allowMultiple: PropTypes.bool,
  defaultOpen: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
};

export default Accordion;
