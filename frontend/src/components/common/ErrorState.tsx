import { useTranslation } from 'react-i18next';

export function ErrorState() {
  const { t } = useTranslation();
  return <div className="state error" role="alert">{t('errors.apiUnavailable')}</div>;
}
