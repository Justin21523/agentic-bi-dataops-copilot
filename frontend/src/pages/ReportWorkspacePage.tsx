import { useEffect, useState } from 'react';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { InsightCardGrid } from '../components/analysis/InsightCardGrid';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { useAnalysisReport, useAnalysisStories } from '../hooks/useAnalysis';

export function ReportWorkspacePage() {
  const stories = useAnalysisStories('overview');
  const [mode, setMode] = useState<'executive' | 'data_scientist'>('executive');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (!selectedIds.length && stories.data?.insights.length) {
      setSelectedIds(stories.data.insights.slice(0, 5).map((item) => item.id));
    }
  }, [selectedIds.length, stories.data?.insights]);
  const report = useAnalysisReport(mode, selectedIds);
  if (stories.isLoading || report.isLoading) return <LoadingState />;
  if (stories.isError || report.isError || !stories.data || !report.data) return <ErrorState />;
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return (
    <section className="page">
      <div data-guide-anchor="report-workspace">
        <ExecutiveSummary
        title="Report Workspace"
        body="Choose evidence-backed insights, switch report audience, and generate a safe Markdown or print-friendly HTML analysis report."
        actions={[report.data.filename, report.data.mode, `${selectedIds.length} insights selected`]}
        />
      </div>
      <div className="tab-strip">
        <button className={mode === 'executive' ? 'active' : 'secondary'} onClick={() => setMode('executive')} type="button">Executive</button>
        <button className={mode === 'data_scientist' ? 'active' : 'secondary'} onClick={() => setMode('data_scientist')} type="button">Data scientist</button>
        <button className="secondary" onClick={() => navigator.clipboard?.writeText(report.data.markdown)} type="button">Copy Markdown</button>
        <button className="secondary" onClick={() => window.print()} type="button">Print HTML</button>
      </div>
      <InsightCardGrid insights={stories.data.insights} selectable selectedIds={selectedIds} onToggle={toggle} />
      <div className="two-column">
        <section className="content-panel">
          <h2>Markdown preview</h2>
          <pre className="markdown-preview">{report.data.markdown}</pre>
        </section>
        <section className="content-panel print-preview">
          <h2>Print-friendly HTML</h2>
          <div dangerouslySetInnerHTML={{ __html: report.data.html }} />
        </section>
      </div>
    </section>
  );
}
