import { useTranslation } from 'react-i18next';

export function ExecutiveSummary({ title, body, actions }: { title: string; body: string; actions?: string[] }) {
  const { t } = useTranslation();
  return (
    <section className="summary-panel">
      <div>
        <span className="brand-kicker">{t('analysis.executiveSummary')}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {actions?.length ? (
        <div className="state-chip-row">
          {actions.map((action) => <span className="badge" key={action}>{action}</span>)}
        </div>
      ) : null}
    </section>
  );
}
