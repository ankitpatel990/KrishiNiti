/**
 * Tabs - Horizontal tab navigation component.
 *
 * Renders a row of tab buttons and the content panel for
 * the active tab. Supports controlled and uncontrolled modes.
 * Keyboard accessible (arrow keys navigate between tabs).
 */

import { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";

function Tabs({
  tabs,
  activeTab: controlledActive,
  onChange,
  className = "",
}) {
  const [internalActive, setInternalActive] = useState(
    tabs.length > 0 ? tabs[0].id : null,
  );
  const tabListRef = useRef(null);

  const isControlled = controlledActive !== undefined;
  const activeId = isControlled ? controlledActive : internalActive;

  const handleTabClick = useCallback(
    (tabId) => {
      if (!isControlled) {
        setInternalActive(tabId);
      }
      if (onChange) {
        onChange(tabId);
      }
    },
    [isControlled, onChange],
  );

  const handleKeyDown = useCallback(
    (event) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIndex = enabledTabs.findIndex((t) => t.id === activeId);
      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % enabledTabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex =
          (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = enabledTabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const nextTab = enabledTabs[nextIndex];
      handleTabClick(nextTab.id);

      // Focus the next tab button
      const buttons = tabListRef.current?.querySelectorAll('[role="tab"]');
      const targetIndex = tabs.findIndex((t) => t.id === nextTab.id);
      buttons?.[targetIndex]?.focus();
    },
    [tabs, activeId, handleTabClick],
  );

  const activeTabData = tabs.find((t) => t.id === activeId);

  return (
    <div className={className}>
      {/* Tab list */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Tabs"
        className="flex border-b border-neutral-200"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id)}
              className={[
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isActive
                  ? "text-primary-700"
                  : "text-neutral-500 hover:text-neutral-700",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                {tab.icon && (
                  <span className="shrink-0" aria-hidden="true">
                    {tab.icon}
                  </span>
                )}
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {tab.badge}
                  </span>
                )}
              </span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panel */}
      {activeTabData && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTabData.id}`}
          aria-labelledby={`tab-${activeTabData.id}`}
          tabIndex={0}
          className="py-4 focus:outline-none"
        >
          {activeTabData.content}
        </div>
      )}
    </div>
  );
}

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      content: PropTypes.node.isRequired,
      icon: PropTypes.node,
      badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  activeTab: PropTypes.string,
  onChange: PropTypes.func,
  className: PropTypes.string,
};

export default Tabs;
