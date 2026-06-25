import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  return <section className="page"><h2>{t('notFound.title')}</h2></section>;
}
