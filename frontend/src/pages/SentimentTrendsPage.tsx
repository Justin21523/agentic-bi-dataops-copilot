import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DrilldownPanel } from '../components/charts/DrilldownPanel';
import { GenreSentimentHeatmap, genreSentimentKey } from '../components/charts/GenreSentimentHeatmap';
import { SentimentTrendChart } from '../components/charts/SentimentTrendChart';
import { ErrorState } from '../components/common/ErrorState';
import { FilterPanel } from '../components/common/FilterPanel';
import { LoadingState } from '../components/common/LoadingState';
import { useDrilldownSongs, useGenreSentiment, useGenres, useSentimentTrends } from '../hooks/useAnalytics';
import { useUrlFilters } from '../hooks/useUrlFilters';

export function SentimentTrendsPage() {
  const { t } = useTranslation();
  const { filters, setFilter, resetFilters } = useUrlFilters();
  const [selection, setSelection] = useState<{ genre: string; sentiment_label: 'negative' | 'neutral' | 'positive'; title: string }>();
  const trends = useSentimentTrends(filters);
  const genres = useGenres();
  const genreSentiment = useGenreSentiment(filters);
  const drilldown = useDrilldownSongs(selection ? { ...filters, genre: selection.genre, sentiment_label: selection.sentiment_label } : undefined);
  if (trends.isLoading) return <LoadingState />;
  if (trends.isError || !trends.data) return <ErrorState />;
  return (
    <section className="page">
      <FilterPanel filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
      <div className="analytics-layout">
        <div className="analytics-main">
        <SentimentTrendChart data={trends.data} />
        <div className="two-column">
          <section className="content-panel">
            <h2>{t('pages.sentiment.mood')}</h2>
            <p>{t('safety.derivedFeaturesOnly')}</p>
          </section>
          <section className="content-panel">
            <h2>{t('pages.sentiment.genreComparison')}</h2>
            <div className="pill-row">{genres.data?.map((item) => <span className="badge" key={item.genre}>{item.genre}: {item.song_count}</span>)}</div>
          </section>
        </div>
        <GenreSentimentHeatmap
          data={genreSentiment.data ?? []}
          activeKey={selection ? genreSentimentKey(selection.genre, selection.sentiment_label) : undefined}
          onSelect={setSelection}
        />
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
    </section>
  );
}
