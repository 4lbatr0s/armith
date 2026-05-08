import React, { useCallback, useRef } from 'react';

/**
 * @param {{ id: string, label: string }[]} tabs
 */
export function TabsBar({ tabs, value, onChange, ariaLabel }) {
  const btnRefs = useRef({});

  const setRef = useCallback((id, el) => {
    if (el) btnRefs.current[id] = el;
  }, []);

  const focusTab = (id) => {
    btnRefs.current[id]?.focus();
  };

  const onKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
    const id = tabs[next].id;
    onChange(id);
    focusTab(id);
  };

  return (
    <div
      className="flex flex-wrap border-2 border-pm-ink dark:border-white/20 rounded-sm overflow-hidden shadow-brutal"
      role="tablist"
      aria-label={ariaLabel || undefined}
    >
      {tabs.map((tab, index) => {
        const selected = value === tab.id;
        const isFirst = index === 0;
        return (
          <button
            key={tab.id}
            ref={(el) => setRef(tab.id, el)}
            type="button"
            role="tab"
            id={`admin-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`admin-tabpanel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, index)}
            onClick={() => onChange(tab.id)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              !isFirst ? 'border-l-2 border-pm-ink dark:border-white/20' : ''
            } ${selected ? 'bg-pm-accent text-white' : 'bg-pm-wash/50 dark:bg-pm-void text-pm-muted hover:text-pm-ink dark:hover:text-pm-ink-soft'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
