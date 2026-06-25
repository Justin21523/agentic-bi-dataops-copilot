import { useTranslation } from 'react-i18next';
import { useLocale } from '../../hooks/useLocale';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  return (
    <label className="language-switcher">
      <span>{t('common.language')}</span>
      <select aria-label={t('common.language')} value={locale} onChange={(event) => setLocale(event.target.value as 'zh-TW' | 'en-US')}>
        <option value="zh-TW">{t('common.chinese')}</option>
        <option value="en-US">{t('common.english')}</option>
      </select>
    </label>
  );
}
