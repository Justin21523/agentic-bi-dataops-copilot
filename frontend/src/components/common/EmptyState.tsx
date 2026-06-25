import { useTranslation } from 'react-i18next';

export function EmptyState() {
  const { t } = useTranslation();
  return <div className="state">{t('common.empty')}</div>;
}
