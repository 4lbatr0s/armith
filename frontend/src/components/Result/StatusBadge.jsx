import React from 'react';

export const StatusBadge = ({ status, t, large }) => {
    const config = {
        approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', dot: 'bg-green-500' },
        rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', dot: 'bg-red-500' },
        failed: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', dot: 'bg-yellow-500' },
        pending: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500 animate-pulse' }
    }[status] || { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' };

    const labels = {
        approved: t('result.status_approved'),
        rejected: t('result.status_rejected'),
        failed: t('result.status_failed'),
        pending: t('result.status_pending')
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium ${config.bg} ${config.text} ${large ? 'text-sm' : 'text-xs'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${config.dot}`} />
            {labels[status] || status}
        </span>
    );
};
