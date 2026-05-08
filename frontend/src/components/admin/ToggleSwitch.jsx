import React from 'react';

export function ToggleSwitch({ label, description, checked, onChange, disabled }) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-sm border-2 ${disabled ? 'opacity-50' : ''} ${
        checked
          ? 'bg-pm-accent/10 border-pm-accent/40'
          : 'bg-pm-wash/40 dark:bg-pm-void/80 border-pm-ink/10 dark:border-white/10'
      }`}
    >
      <div className="flex-1 pr-4">
        <p className="font-display font-semibold text-pm-ink dark:text-pm-ink-soft">{label}</p>
        <p className="text-sm text-pm-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-pm-ink/20 dark:border-white/20 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-pm-accent focus-visible:ring-offset-2 ${
          checked ? 'bg-pm-accent' : 'bg-pm-muted/30'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-pm-surface dark:bg-pm-surface-dark shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
