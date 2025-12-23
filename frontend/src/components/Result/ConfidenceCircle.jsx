import React from 'react';

export const ConfidenceCircle = ({ label, value, threshold }) => {
    const percentage = Math.round((value || 0) * 100);
    const isGood = (value || 0) >= threshold;
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-600" />
                    <circle
                        cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={isGood ? 'text-green-500' : 'text-red-500'}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {percentage}%
                    </span>
                </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">{label}</p>
        </div>
    );
};
