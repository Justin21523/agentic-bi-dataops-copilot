import { useTranslation } from 'react-i18next';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { DatasetUploadPanel } from '../components/common/DatasetUploadPanel';
import { ExplanationPanel } from '../components/common/ExplanationPanel';
import { WorkflowStepper } from '../components/common/WorkflowStepper';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useCleaningPreview, useDatasetProfile } from '../hooks/useAnalysis';

export function DatasetWorkflowPage() {
  const { t } = useTranslation();
  const profile = useDatasetProfile();
  const cleaning = useCleaningPreview();
  if (profile.isLoading) return <LoadingState />;
  if (profile.isError || !profile.data) return <ErrorState />;
  return (
    <section className="page">
      <ExecutiveSummary
        title={t('workflow.pageTitle')}
        body={t('workflow.pageSummary')}
        actions={[t('workflow.demoDataset'), t('workflow.metadataOnly'), t('workflow.readyForModeling')]}
      />
      <DatasetUploadPanel />
      <WorkflowStepper steps={profile.data.workflow} />
      <div className="metric-grid">
        <MetricCard label={t('analysis.rows')} value={profile.data.row_count} />
        <MetricCard label={t('analysis.columns')} value={profile.data.column_count} />
        <MetricCard label={t('analysis.missingCells')} value={profile.data.missing_cells} />
        <MetricCard label={t('analysis.duplicates')} value={profile.data.duplicate_rows} />
      </div>
      <div className="two-column">
        <section className="content-panel" data-journey-anchor="inspect">
          <h2>{t('analysis.schemaProfile')}</h2>
          <table>
            <thead><tr><th>{t('analysis.column')}</th><th>{t('analysis.type')}</th><th>{t('analysis.missing')}</th><th>{t('analysis.unique')}</th></tr></thead>
            <tbody>
              {profile.data.columns.slice(0, 14).map((column) => (
                <tr key={column.name}><td>{column.name}</td><td>{column.dtype}</td><td>{column.missing}</td><td>{column.unique}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="content-panel" data-journey-anchor="clean">
          <h2>{t('analysis.cleaningPreview')}</h2>
          <p>{t('analysis.cleaningSummary', { rows: cleaning.data?.output_rows ?? profile.data.row_count })}</p>
          <div className="list-panel">
            {(cleaning.data?.recommended_actions ?? []).map((action) => <article className="list-row" key={action}>{action}</article>)}
          </div>
        </section>
      </div>
      <ExplanationPanel
        title="Dataset workflow interpretation"
        what="This page shows the active dataset, schema shape, quality issues, and the expected effect of cleaning."
        how="Read from upload to inspect to clean: row counts and missing values tell you whether analysis inputs are stable."
        why="Bad schema mapping or raw protected text would make every downstream chart misleading or unsafe."
        caveat="The platform accepts derived feature CSVs. If upload validation fails, fix the missing files or forbidden columns first."
      />
      <section className="content-panel">
        <h2>{t('analysis.categoryProfile')}</h2>
        <div className="comparison-grid">
          {Object.entries(profile.data.categorical_summary).slice(0, 4).map(([column, values]) => (
            <article className="analysis-card" key={column}>
              <h2>{column}</h2>
              {values.map((item) => (
                <div key={item.value}>
                  <strong>{item.value}</strong>
                  <div className="progress-bar"><span style={{ width: `${Math.min(100, (item.count / profile.data.row_count) * 100)}%` }} /></div>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
