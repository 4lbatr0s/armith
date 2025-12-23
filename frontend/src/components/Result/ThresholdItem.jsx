import React from 'react';

export const ThresholdItem = ({ label, value }) => (
    <div className="flex justify-between py-1">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-900 dark:text-white font-mono text-xs">{value}</span>
    </div>
);
