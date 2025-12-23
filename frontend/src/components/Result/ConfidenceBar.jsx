import React from 'react';

export const ConfidenceBar = ({ label, value, threshold }) => {
    const percentage = Math.round((value || 0) * 100);
    const isGood = (value || 0) >= threshold;

    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className={`font-semibold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {percentage}%
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${isGood ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
