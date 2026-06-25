import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LeakageAuditPanel } from '../components/analysis/LeakageAuditPanel';
import { ModelMetricsChart } from '../components/analysis/ModelMetricsChart';
import { PerClassMetricsChart } from '../components/analysis/PerClassMetricsChart';
import { EvaluationStoryline } from '../components/analysis/EvaluationStoryline';
import { ConfusionMatrixHeatmap, confusionMatrixKey } from '../components/charts/ConfusionMatrixHeatmap';
import { DrilldownPanel } from '../components/charts/DrilldownPanel';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { ExplanationPanel } from '../components/common/ExplanationPanel';
import { useClassificationAnalysis } from '../hooks/useAnalysis';
import { useDataQualityReport, useDrilldownSongs, useEvaluation } from '../hooks/useAnalytics';

export function EvaluationPage() {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<{ genre: string; predicted_genre: string; title: string }>();
  const { data, isLoading, isError } = useEvaluation();
  const classification = useClassificationAnalysis();
  const dataQuality = useDataQualityReport();
  const drilldown = useDrilldownSongs(selection ? { genre: selection.genre, predicted_genre: selection.predicted_genre } : undefined);
  if (isLoading || classification.isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  const confusion = data.confusion_matrix as { labels?: string[]; matrix?: number[][] } | undefined;
  const perGenre = data.per_genre_metrics as Record<string, { f1: number; precision: number; recall: number }> | undefined;
  const retrieval = data.retrieval_examples as Array<{ title: string; genre: string; matches: Array<{ title: string; genre: string; similarity_score: number }> }> | undefined;
  const good = data.good_examples as typeof retrieval | undefined;
  const bad = data.bad_examples as typeof retrieval | undefined;
  const retrievalRows = retrieval?.slice(0, 8).map((item) => ({
    title: item.title,
    best: item.matches[0]?.similarity_score ?? 0,
    genre: item.genre
  })) ?? [];
  return (
    <section className="page">
      <section className="content-panel evaluation-flow-panel" data-guide-anchor="evaluation-flow">
        <h2>Model evaluation path</h2>
        <p>Evaluation is not one number. Read it as a chain: split the data, fit TF-IDF on train only, compare models, inspect confusion, then explain error cases.</p>
        <div className="evaluation-flow-steps" aria-label="Evaluation path">
          {['Train/Test split', 'TF-IDF fit on train', 'Model comparison', 'Confusion matrix', 'Error storyline'].map((item, index) => (
            <article key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>
      <div data-journey-anchor="evaluation">
        {classification.data && (
          <ModelMetricsChart
            models={classification.data.models}
            baselineAccuracy={classification.data.baseline?.accuracy}
          />
        )}
      </div>
      <ExplanationPanel
        title="Evaluation interpretation"
        what="Evaluation combines classifier scores, confusion patterns, per-genre behavior, retrieval examples, and data quality."
        how="Start with model comparison, inspect the confusion matrix for repeated mistakes, then read per-class bars."
        why="A useful model must be accurate, balanced across classes, and supported by metadata-only error analysis."
        caveat="Scores from a synthetic demo can be high; leakage audit and held-out split details are required before trusting them."
      />
      <div className="analytics-layout">
        <div className="analytics-main">
          <div className="two-column">
            <ConfusionMatrixHeatmap
              data={confusion}
              activeKey={selection ? confusionMatrixKey(selection.genre, selection.predicted_genre) : undefined}
              onSelect={setSelection}
            />
            <PerClassMetricsChart metrics={perGenre} title={t('pages.evaluation.perGenre')} />
          </div>
          {classification.data?.leakage_audit && <LeakageAuditPanel audit={classification.data.leakage_audit} />}
        </div>
        {selection && (
          <DrilldownPanel
            title={selection.title}
            subtitle={t('charts.drilldownSubtitle')}
            songs={drilldown.data}
            isLoading={drilldown.isLoading}
            onClose={() => setSelection(undefined)}
          />
        )}
      </div>
      <EvaluationStoryline confusion={confusion} perGenre={perGenre} badExamples={bad} />
      <section className="chart-panel" data-journey-anchor="report">
        <h2>{t('pages.evaluation.retrievalExamples')}</h2>
        <div className="recharts-panel compact-chart">
          <ResponsiveContainer>
            <BarChart data={retrievalRows} layout="vertical" margin={{ top: 8, right: 24, left: 90, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
              <XAxis type="number" domain={[0, 1]} />
              <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => value.toFixed(3)} />
              <Bar dataKey="best" name="Top similarity score" fill="#1696D2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="list-panel compact-list">{retrieval?.slice(0, 4).map((item) => <article className="list-row" key={item.title}><strong>{item.title}</strong><span>{item.genre}</span><span>{item.matches.map((match) => `${match.title} (${match.similarity_score})`).join(', ')}</span></article>)}</div>
      </section>
      <div className="two-column">
        <section className="content-panel">
          <h2>{t('pages.evaluation.goodExamples')}</h2>
          <div className="list-panel">{good?.map((item) => <article className="list-row" key={item.title}><strong>{item.title}</strong><span>{item.matches.map((match) => `${match.title}: ${match.genre}`).join(', ')}</span></article>)}</div>
        </section>
        <section className="content-panel">
          <h2>{t('pages.evaluation.badExamples')}</h2>
          <div className="list-panel">{bad?.map((item) => <article className="list-row" key={item.title}><strong>{item.title}</strong><span>{item.matches.map((match) => `${match.title}: ${match.genre}`).join(', ')}</span></article>)}</div>
        </section>
      </div>
      <section className="content-panel">
        <h2>{t('pages.evaluation.dataQuality')}</h2>
        <p>{dataQuality.data?.status}</p>
        <div className="pill-row">{Object.entries(dataQuality.data?.tables ?? {}).map(([table, info]) => <span className="badge" key={table}>{table}: {info.rows}</span>)}</div>
      </section>
      <section className="content-panel"><h2>{t('pages.evaluation.badCases')}</h2><p>{t('safety.derivedFeaturesOnly')}</p></section>
    </section>
  );
}
