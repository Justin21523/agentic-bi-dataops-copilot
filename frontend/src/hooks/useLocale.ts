import { useTranslation } from 'react-i18next';

export function useLocale() {
  const { i18n } = useTranslation();
  const setLocale = (locale: 'zh-TW' | 'en-US') => {
    localStorage.setItem('lyrics_lab_locale', locale);
    void i18n.changeLanguage(locale);
  };
  return { locale: i18n.language, setLocale };
}
