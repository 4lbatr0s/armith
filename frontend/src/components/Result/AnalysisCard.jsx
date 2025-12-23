import React from 'react';

export const AnalysisCard = ({ label, value, icon, good, expected, inverse }) => (
    <div className={`p-4 rounded-lg border-2 ${good ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{icon}</span>
            {good ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            )}
        </div>
        <p className={`text-lg font-bold capitalize ${good ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {value}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {expected !== undefined && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Expected: {expected}</p>
        )}
    </div>
);
