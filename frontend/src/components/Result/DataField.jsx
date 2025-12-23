import React from 'react';

export const DataField = ({ label, value, icon, mono, capitalize, highlight }) => (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{icon} {label}</p>
        <p className={`text-sm font-semibold text-gray-900 dark:text-white truncate ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''} ${highlight ? 'text-red-600 dark:text-red-400' : ''}`}>
            {value || '—'}
        </p>
    </div>
);
