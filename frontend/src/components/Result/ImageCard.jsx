import React from 'react';

export const ImageCard = ({ label, url, status, large }) => (
    <div className="relative group">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <img
                src={url}
                alt={label}
                className={`w-full object-cover ${large ? 'h-48' : 'h-28'} group-hover:scale-105 transition-transform duration-200`}
            />
            {status && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${status === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}>
                    {status === 'approved' ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>
            )}
        </div>
    </div>
);
