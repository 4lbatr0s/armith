import React from 'react';

export const DataField = ({ label, value, icon, mono, capitalize, highlight }) => (
    <div className={`p-3 rounded-sm border-2 border-transparent ${highlight ? 'bg-pm-accent/10 dark:bg-pm-accent/15 border-pm-accent/20' : 'bg-pm-wash/60 dark:bg-white/5'}`}>
        <p className="text-xs text-pm-muted mb-1">{icon} {label}</p>
        <p className={`text-sm font-semibold text-pm-ink dark:text-pm-ink-soft truncate ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''} ${highlight ? 'text-pm-accent dark:text-pm-accent-alt' : ''}`}>
            {value || '—'}
        </p>
    </div>
);
