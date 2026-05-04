import React from 'react';

function parseStringError(s) {
  const t = s.trim();
  if (!t) return { lines: [{ type: 'raw', text: '' }] };
  const dotParts = t.split(/\s*·\s*/);
  if (dotParts.length >= 2) {
    const field = dotParts[0].trim();
    const rest = dotParts.slice(1).join(' · ');
    const ci = rest.indexOf(': ');
    if (ci !== -1) {
      return {
        field: field || null,
        code: rest.slice(0, ci).trim() || null,
        message: rest.slice(ci + 2).trim() || null
      };
    }
  }
  const ci = t.indexOf(': ');
  if (ci !== -1) {
    const head = t.slice(0, ci).trim();
    const msg = t.slice(ci + 2).trim();
    if (/^[A-Z][A-Z0-9_]*$/i.test(head)) {
      return { field: null, code: head, message: msg || null };
    }
  }
  return { lines: [{ type: 'raw', text: t }] };
}

function parseError(error) {
  if (error == null) return { lines: [] };
  if (typeof error === 'string') return parseStringError(error);
  if (typeof error === 'object') {
    const message = error.message != null ? String(error.message) : '';
    const code = error.textCode ?? error.code;
    const field = error.field != null ? String(error.field) : '';
    if (!message && !code && !field) {
      try {
        return { lines: [{ type: 'raw', text: JSON.stringify(error) }] };
      } catch {
        return { lines: [{ type: 'raw', text: '' }] };
      }
    }
    return { field: field || null, code: code != null ? String(code) : null, message: message || null };
  }
  return { lines: [{ type: 'raw', text: String(error) }] };
}

export const ErrorSection = ({ errors = [], t }) => (
  <div className="border-2 border-pm-ink bg-pm-surface shadow-brutal dark:border-white/25 dark:bg-pm-surface-dark">
    <div className="flex items-center gap-3 border-b-2 border-pm-ink bg-pm-ink px-4 py-3 dark:border-white/25">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-white/30 bg-pm-accent text-white">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z" />
        </svg>
      </span>
      <h4 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-white">
        {t('result.issues_found')}
      </h4>
    </div>

    <ul className="divide-y-2 divide-pm-ink/10 p-0 dark:divide-white/10">
      {errors.map((error, index) => {
        const parsed = parseError(error);
        if (parsed.lines) {
          return (
            <li key={index} className="px-4 py-3">
              <p className="font-mono text-xs leading-relaxed text-pm-ink dark:text-pm-ink-soft">{parsed.lines[0].text}</p>
            </li>
          );
        }
        const { field, code, message } = parsed;
        return (
          <li key={index} className="px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {field ? (
                <span className="inline-flex border-2 border-pm-ink bg-pm-wash px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-pm-ink dark:border-white/30 dark:bg-pm-void dark:text-pm-ink-soft">
                  {field}
                </span>
              ) : null}
              {code ? (
                <span className="inline-flex border-2 border-pm-ink bg-pm-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white dark:border-white/40 dark:bg-white/10 dark:text-pm-ink-soft">
                  {code}
                </span>
              ) : null}
            </div>
            {message ? (
              <p className="border-l-4 border-pm-accent pl-3 text-sm font-medium leading-snug text-pm-ink dark:text-zinc-200">
                {message}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  </div>
);
