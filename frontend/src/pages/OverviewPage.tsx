import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { InsightCardGrid } from '../components/analysis/InsightCardGrid';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { useAnalysisStories, useDatasetProfile } from '../hooks/useAnalysis';
import { useHighlights, useOverview } from '../hooks/useAnalytics';

export function OverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOverview();
  const profile = useDatasetProfile();
  const highlights = useHighlights();
  const stories = useAnalysisStories('overview');
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  return (
    <section className="page">
      <div className="executive-grid">
        <div data-guide-anchor="overview-hero">
          <ExecutiveSummary
          title={t('overview.heroTitle')}
          body={t('overview.heroBody')}
          actions={[t('workflow.demoDataset'), t('analysis.scikitLearnRuntime'), t('safety.noFullLyrics')]}
          />
        </div>
        <section className="summary-panel">
          <span className="brand-kicker">{t('overview.pipelineHealth')}</span>
          <h2>{profile.data?.name ?? t('common.loading')}</h2>
          <p>{t('overview.pipelineBody')}</p>
          <div className="state-chip-row">
            <span className="badge">{profile.data?.row_count ?? data.total_songs} rows</span>
            <span className="badge">{profile.data?.column_count ?? 0} columns</span>
            <span className="badge warning">{profile.data?.missing_cells ?? 0} missing</span>
          </div>
        </section>
      </div>
      <div className="metric-grid">
        <MetricCard label={t('metrics.totalSongs')} value={data.total_songs} />
        <MetricCard label={t('metrics.totalArtists')} value={data.total_artists} />
        <MetricCard label={t('metrics.topicCount')} value={data.topic_count} />
        <MetricCard label={t('metrics.genreCount')} value={data.genre_count} />
        <MetricCard label={t('metrics.languageCount')} value={data.language_count} />
        <MetricCard label={t('metrics.yearCoverage')} value={`${data.year_from} - ${data.year_to}`} />
      </div>
      <section className="content-panel" data-guide-anchor="overview-stories">
        <div className="section-heading-row">
          <div>
            <span className="brand-kicker">{t('pages.overview.story')}</span>
            <h2>What should I look at first?</h2>
          </div>
          <button type="button" onClick={() => navigate('/stories')}>Open Story Builder</button>
        </div>
        <InsightCardGrid insights={stories.data?.insights.slice(0, 5)} />
      </section>
      <div className="comparison-grid">
        <article className="analysis-card">
          <h2>{t('navigation.workflow')}</h2>
          <p>{t('overview.workflowCard')}</p>
          <button type="button" onClick={() => navigate('/workflow')}>{t('overview.openWorkflow')}</button>
        </article>
        <article className="analysis-card">
          <h2>{t('navigation.mlLab')}</h2>
          <p>{t('overview.mlCard')}</p>
          <button type="button" onClick={() => navigate('/ml-lab')}>{t('overview.openMlLab')}</button>
        </article>
        <article className="analysis-card">
          <h2>{t('charts.decadeTopicHeatmap')}</h2>
          <p>{t('overview.visualCard')}</p>
          <button type="button" onClick={() => navigate('/topics')}>{t('overview.openVisuals')}</button>
        </article>
        <article className="analysis-card">
          <h2>{t('pages.overview.highlights')}</h2>
          <div className="pill-row">
            {highlights.data?.rising_terms.slice(0, 4).map((item, index) => <span className="badge" key={`${item.decade}-${item.term}-${index}`}>{item.decade}: {item.term}</span>)}
          </div>
          <div className="card-footer-note">{t('overview.highlightNote')}</div>
        </article>
      </div>
    </section>
  );
}
