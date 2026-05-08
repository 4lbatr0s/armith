import React from 'react';
import { Toaster } from 'sonner';
import { useTheme } from './ThemeContext';

export function ToasterHost() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme === 'dark' ? 'dark' : 'light'}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'border-2 border-pm-ink dark:border-white/20 rounded-sm font-sans bg-pm-surface dark:bg-pm-surface-dark text-pm-ink dark:text-pm-ink-soft shadow-brutal',
          title: 'font-semibold',
          description: 'text-pm-muted',
          closeButton: 'border-2 border-pm-ink/20 dark:border-white/20',
        },
      }}
    />
  );
}
