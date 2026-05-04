import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const ImageLightbox = ({ open, url, title, onClose }) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !url) return null;

  const caption = title?.trim();

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 sm:p-8 bg-pm-ink/88 dark:bg-black/90 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center border-2 border-white/30 bg-pm-surface-dark text-pm-ink-soft rounded-sm text-sm font-bold uppercase tracking-wider hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-pm-accent"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className="relative max-h-[88vh] max-w-[96vw] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={caption || t('result.image_preview_a11y')}
      >
        <div className="relative inline-block max-h-[85vh] max-w-full">
          <img
            src={url}
            alt={caption || t('result.image_preview_a11y')}
            className="max-h-[85vh] max-w-full object-contain rounded-sm border-2 border-white/25 shadow-brutal block cursor-default"
          />
          {caption ? (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto max-w-[min(100%,24rem)] border-2 border-pm-ink dark:border-white/30 bg-pm-paper dark:bg-pm-surface-dark px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-pm-ink dark:text-pm-ink-soft shadow-brutal">
              {caption}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-pm-ink-soft/60">
        {t('result.image_lightbox_hint')}
      </p>
    </div>
  );
};
