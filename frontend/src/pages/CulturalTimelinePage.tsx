import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DrilldownPanel } from '../components/charts/DrilldownPanel';
import { LanguageRegionStackedTrend } from '../components/charts/LanguageRegionStackedTrend';
import { YearlyTermsChart } from '../components/charts/YearlyTermsChart';
import { ErrorState } from '../components/common/ErrorState';
import { FilterPanel } from '../components/common/FilterPanel';
import { LoadingState } from '../components/common/LoadingState';
import { useDecadeTrends, useDrilldownSongs, useLanguageCulture, useYearlyTerms } from '../hooks/useAnalytics';
import { useUrlFilters } from '../hooks/useUrlFilters';

export function CulturalTimelinePage() {
  const { t } = useTranslation();
  const { filters, setFilter, resetFilters } = useUrlFilters();
  const [selection, setSelection] = useState<{ decade: string; language?: string; region?: string; title: string }>();
  const { data, isLoading, isError } = useYearlyTerms(filters);
  const decade = useDecadeTrends(filters);
  const culture = useLanguageCulture(filters);
  const drilldown = useDrilldownSongs(selection ? { ...filters, decade: selection.decade, language: selection.language, region: selection.region } : undefined);
  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState />;
  return (
    <section className="page">
      <FilterPanel filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
      <div className="analytics-layout">
        <div className="analytics-main">
          <LanguageRegionStackedTrend data={culture.data ?? []} onSelect={setSelection} />
          <div className="two-column">
            <YearlyTermsChart data={data} />
            <section className="content-panel">
              <h2>{t('charts.decadeTerms')}</h2>
              <table><tbody>{decade.data?.slice(0, 16).map((item) => <tr key={`${item.decade}-${item.term}`}><td>{item.decade}</td><td>{item.term}</td><td>{item.score.toFixed(2)}</td></tr>)}</tbody></table>
            </section>
          </div>
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
