import { useTranslation } from 'react-i18next';

export function SafetyNotice() {
  const { t } = useTranslation();
  return (
    <section className="notice" aria-label={t('safety.title')}>
      <strong>{t('safety.noFullLyrics')}</strong>
      <p>{t('safety.derivedFeaturesOnly')}</p>
    </section>
  );
}
