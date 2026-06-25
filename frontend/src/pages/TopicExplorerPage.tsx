import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DecadeTopicHeatmap, decadeTopicKey } from '../components/charts/DecadeTopicHeatmap';
import { DrilldownPanel } from '../components/charts/DrilldownPanel';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { FilterPanel } from '../components/common/FilterPanel';
import { LoadingState } from '../components/common/LoadingState';
import { TopicBubbleChart } from '../components/charts/TopicBubbleChart';
import { useDrilldownSongs, useTopicDecade, useTopicQuality, useTopicSongs, useTopicTerms, useTopics } from '../hooks/useAnalytics';
import { useUrlFilters } from '../hooks/useUrlFilters';

export function TopicExplorerPage() {
  const { t } = useTranslation();
  const [selectedTopic, setSelectedTopic] = useState<number | undefined>();
  const [heatmapSelection, setHeatmapSelection] = useState<{ topic_id: number; decade: string; title: string; topic_label: string }>();
  const { filters, setFilter, resetFilters } = useUrlFilters();
  const { data, isLoading, isError } = useTopics(filters);
  const topicDecade = useTopicDecade(filters);
  const related = useTopicSongs(selectedTopic);
  const terms = useTopicTerms(selectedTopic);
  const quality = useTopicQuality();
  const drilldown = useDrilldownSongs(heatmapSelection ? { ...filters, topic_id: heatmapSelection.topic_id, decade: heatmapSelection.decade } : undefined);
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data?.length) return <EmptyState />;
  return (
    <section className="page">
      <FilterPanel filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
      <div className="analytics-layout">
        <div className="analytics-main">
          <DecadeTopicHeatmap
            data={topicDecade.data ?? []}
            activeKey={heatmapSelection ? decadeTopicKey(heatmapSelection.topic_label, heatmapSelection.decade) : undefined}
            onSelect={(selection) => {
              const topic = data.find((item) => item.topic_id === selection.topic_id);
              setSelectedTopic(selection.topic_id);
              setHeatmapSelection({ ...selection, topic_label: topic?.topic_label ?? selection.title.split(' / ')[0] });
            }}
          />
      <div className="two-column">
        <TopicBubbleChart data={data} />
        <section className="content-panel">
          <h2>{t('pages.topic.table')}</h2>
          <table><tbody>{data.map((topic) => <tr key={topic.topic_id}><td><button type="button" onClick={() => setSelectedTopic(topic.topic_id)}>{topic.topic_label}</button></td><td>{topic.song_count}</td><td>{topic.average_score.toFixed(2)}</td></tr>)}</tbody></table>
        </section>
      </div>
      {selectedTopic !== undefined && (
        <div className="two-column">
          <section className="content-panel">
            <h2>{t('pages.topic.relatedSongs')}</h2>
            <div className="list-panel">
              {related.data?.map((song) => (
                <article className="list-row" key={song.song_id}>
                  <strong>{song.title}</strong>
                  <span>{song.artist_name} · {song.genre} · {song.year}</span>
                  <span>{t('common.score')}: {song.topic_score.toFixed(2)}</span>
                </article>
              ))}
            </div>
          </section>
          <section className="content-panel">
            <h2>{t('pages.topic.topTerms')}</h2>
            <p>{t('pages.topic.coherenceNote')}</p>
            <div className="pill-row">{terms.data?.map((term) => <span className="badge" key={term.term}>{term.term}: {term.score.toFixed(2)}</span>)}</div>
          </section>
        </div>
      )}
        </div>
        {heatmapSelection && (
          <DrilldownPanel
            title={heatmapSelection.title}
            subtitle={t('charts.drilldownSubtitle')}
            songs={drilldown.data}
            isLoading={drilldown.isLoading}
            onClose={() => setHeatmapSelection(undefined)}
          />
        )}
      </div>
      <section className="content-panel">
        <h2>{t('pages.topic.quality')}</h2>
        <table><tbody>{quality.data?.map((topic) => <tr key={topic.topic_id} className={topic.topic_id === selectedTopic ? 'selected' : undefined}><td>{topic.topic_label}</td><td>{topic.song_count}</td><td>{topic.coherence}</td><td>{topic.top_terms.map((term) => term.term).join(', ')}</td></tr>)}</tbody></table>
      </section>
      <section className="content-panel"><h2>{t('pages.analysis.interpretationNotes')}</h2><p>{t('pages.topic.coherenceNote')}</p></section>
    </section>
  );
}
