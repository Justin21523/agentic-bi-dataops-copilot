import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  return (
    <header className="app-header">
      <div className="brand-block">
        <span className="brand-kicker">{t('app.kicker')}</span>
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
