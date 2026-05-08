/**
 * Clerk SignIn / SignUp styling aligned with pm-* neo-brutalist tokens (tailwind.config + index.css).
 */
const PM_ACCENT = '#145f57';
const PM_ACCENT_ALT = '#4a8f86';
const PM_INK = '#121826';
const PM_INK_SOFT = '#e8ecf2';
const PM_SURFACE = '#ffffff';
const PM_SURFACE_DARK = '#1a1b1f';
const PM_VOID = '#121316';
const PM_TEXT_MUTED_LIGHT = '#3d4756';
const PM_TEXT_MUTED_DARK = '#aab4c5';

/** @param {'light' | 'dark'} theme */
export function buildClerkAppearance(theme) {
  const isDark = theme === 'dark';

  const variables = isDark
    ? {
        colorPrimary: PM_ACCENT_ALT,
        colorText: PM_INK_SOFT,
        colorTextSecondary: PM_TEXT_MUTED_DARK,
        colorBackground: PM_SURFACE_DARK,
        colorInputBackground: PM_VOID,
        colorInputText: PM_INK_SOFT,
        colorNeutral: '#2a2d33',
        colorDanger: '#f87171',
        colorSuccess: PM_ACCENT_ALT,
        colorWarning: '#fbbf24',
        borderRadius: '0.125rem',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif'
      }
    : {
        colorPrimary: PM_ACCENT,
        colorText: PM_INK,
        colorTextSecondary: PM_TEXT_MUTED_LIGHT,
        colorBackground: PM_SURFACE,
        colorInputBackground: PM_SURFACE,
        colorInputText: PM_INK,
        colorNeutral: '#e5e7eb',
        colorDanger: '#dc2626',
        colorSuccess: PM_ACCENT,
        colorWarning: '#ca8a04',
        borderRadius: '0.125rem',
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif'
      };

  return {
    baseTheme: isDark ? 'dark' : 'light',
    variables,
    layout: {
      socialButtonsVariant: 'blockButton',
      socialButtonsPlacement: 'bottom'
    },
    elements: {
      rootBox: 'w-full max-w-none',
      card: '!bg-pm-surface dark:!bg-pm-surface-dark !border-2 !border-solid !border-pm-ink dark:!border-white/15 !rounded-sm cl-pm-auth-card',
      cardBox:
        '!bg-pm-surface dark:!bg-pm-surface-dark',
      headerTitle: '!font-display !font-bold !tracking-tight',
      headerSubtitle: '!text-pm-muted uppercase !text-xs !tracking-[0.2em]',
      formButtonPrimary:
        '!rounded-sm !font-semibold !uppercase !tracking-wide !text-sm !shadow-brutal !border-2 !border-pm-ink dark:!border-white/20',
      formButtonSecondary:
        '!rounded-sm !font-semibold !uppercase !tracking-wide !text-sm !border-2',
      socialButtonsBlockButton:
        '!rounded-sm !font-semibold !text-sm !border-2 !border-pm-ink/20 dark:!border-white/25 !bg-pm-surface dark:!bg-pm-void !text-pm-ink dark:!text-pm-ink-soft hover:!bg-pm-wash/70 dark:hover:!bg-white/10',
      socialButtonsBlockButtonText:
        '!text-pm-ink dark:!text-pm-ink-soft !font-semibold',
      socialButtonsProviderIcon:
        'dark:brightness-125 dark:contrast-125',
      footerActionLink: '!font-semibold !uppercase !text-xs !tracking-wider',
      formFieldLabel: '!text-pm-muted !uppercase !text-xs !tracking-widest',
      formFieldInput:
        '!rounded-sm !border-2 !border-pm-ink/20 dark:!border-white/20 !bg-pm-surface dark:!bg-pm-surface-dark focus:!shadow-none',
      dividerLine: '!bg-pm-ink/15 dark:!bg-white/15',
      identityPreviewEditButtonIcon: '!text-pm-accent dark:!text-pm-accent-alt',
      accordionTriggerButton: '!rounded-sm'
    }
  };
}
