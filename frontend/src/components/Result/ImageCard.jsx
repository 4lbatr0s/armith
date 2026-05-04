import React from 'react';

export const ImageCard = ({ label, url, status, large, onPreview }) => {
  const interactive = Boolean(url && onPreview);

  return (
    <div className="relative group">
      <p className="text-xs font-bold uppercase tracking-widest text-pm-muted mb-2">{label}</p>
      <div
        className={`relative overflow-hidden rounded-sm border-2 border-pm-ink/15 dark:border-white/15 bg-pm-wash/30 dark:bg-pm-void/50 ${
          interactive ? 'cursor-brutal focus-within:ring-2 focus-within:ring-pm-accent' : ''
        }`}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={() => interactive && onPreview()}
        onKeyDown={(e) => {
          if (!interactive) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview();
          }
        }}
      >
        <img
          src={url}
          alt={label}
          className={`w-full object-cover ${large ? 'h-48' : 'h-28'} ${interactive ? 'transition-transform duration-200 group-hover:scale-[1.02]' : ''}`}
          draggable={false}
        />
        {status && (
          <div
            className={`absolute top-2 right-2 w-7 h-7 rounded-sm border-2 border-pm-ink/20 dark:border-white/40 flex items-center justify-center ${
              status === 'approved'
                ? 'bg-pm-accent-alt text-pm-ink'
                : status === 'rejected'
                  ? 'bg-pm-accent text-white'
                  : 'bg-amber-500 text-pm-ink'
            }`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            {status === 'approved' ? (
              <svg className="h-4 w-4 text-pm-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
