import React from 'react';

const base = 'animate-pulse rounded-sm bg-pm-wash dark:bg-white/10';

export function Skeleton({ className = '', ...props }) {
  return <div className={`${base} ${className}`.trim()} role="presentation" {...props} />;
}

export function SkeletonRow({ cols = 4, className = '' }) {
  return (
    <tr className={className}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[12rem]" />
        </td>
      ))}
    </tr>
  );
}
