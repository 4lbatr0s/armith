import React from 'react';

export const ErrorSection = ({ errors, t }) => (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('result.issues_found')}
        </h4>
        <ul className="space-y-2">
            {errors.map((error, index) => (
                <li key={index} className="flex items-start text-sm text-red-700 dark:text-red-300">
                    <span className="text-red-500 mr-2">•</span>
                    {error}
                </li>
            ))}
        </ul>
    </div>
);
