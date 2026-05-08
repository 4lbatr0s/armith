import React from 'react';

export function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    gray: 'text-pm-muted',
    green: 'text-pm-accent-alt',
    yellow: 'text-amber-500',
    red: 'text-pm-accent',
  };

  return (
    <div className="pm-panel overflow-hidden transition-colors duration-200">
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 ${colorClasses[color]}`}>{icon}</div>
          <div className="min-w-0 flex-1">
            <dl>
              <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-pm-muted truncate">{label}</dt>
              <dd className="font-display text-2xl font-bold text-pm-ink dark:text-pm-ink-soft">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
