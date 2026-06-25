import { useTranslation } from 'react-i18next';

export function LicensingPage() {
  const { t } = useTranslation();
  return (
    <section className="page wide-grid" data-guide-anchor="licensing-safety">
      <section className="content-panel"><h2>{t('pages.licensing.sources')}</h2><p>musiXmatch BoW · WASABI metadata</p></section>
      <section className="content-panel"><h2>{t('pages.licensing.displayed')}</h2><p>{t('safety.derivedFeaturesOnly')}</p></section>
      <section className="content-panel"><h2>{t('pages.licensing.notDisplayed')}</h2><p>{t('safety.noFullLyrics')}</p></section>
      <section className="content-panel"><h2>{t('pages.licensing.notes')}</h2><p>{t('safety.publicDemoNotice')}</p></section>
    </section>
  );
}
