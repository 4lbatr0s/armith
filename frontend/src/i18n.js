import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tr from './locales/tr.json';

function syncHtmlLang(lng) {
  if (typeof document === 'undefined') return;
  const base = (lng || i18n.language || 'en').replace('_', '-').split('-')[0];
  document.documentElement.lang = base;
}

i18n.on('languageChanged', syncHtmlLang);

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(
        {
            resources: {
                en: {
                    translation: en,
                },
                tr: {
                    translation: tr,
                },
            },
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
        },
        () => {
            syncHtmlLang(i18n.language);
        }
    );

export default i18n;
