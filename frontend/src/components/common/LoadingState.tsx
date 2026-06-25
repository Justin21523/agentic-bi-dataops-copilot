import { useTranslation } from 'react-i18next';

export function LoadingState() {
  const { t } = useTranslation();
  return <div className="state skeleton" role="status">{t('common.loading')}</div>;
}
