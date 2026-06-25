import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from './locales/en-US.json';
import zhTW from './locales/zh-TW.json';

export const defaultLocale = 'zh-TW';

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    'en-US': { translation: enUS }
  },
  lng: localStorage.getItem('lyrics_lab_locale') ?? defaultLocale,
  fallbackLng: defaultLocale,
  interpolation: { escapeValue: false }
});

export default i18n;
