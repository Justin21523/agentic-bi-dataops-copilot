import { useTranslation } from 'react-i18next';
import { useFilterOptions } from '../../hooks/useAnalytics';
import type { DashboardFilters } from '../../hooks/useUrlFilters';

type Props = {
  filters: DashboardFilters;
  setFilter: (key: keyof DashboardFilters, value: string) => void;
  resetFilters: () => void;
};

export function FilterPanel({ filters, setFilter, resetFilters }: Props) {
  const { t } = useTranslation();
  const options = useFilterOptions();
  return (
    <div className="filter-panel compact-filter">
      <label>
        <span>{t('common.genre')}</span>
        <select value={filters.genre ?? ''} onChange={(event) => setFilter('genre', event.target.value)}>
          <option value="">{t('common.all')}</option>
          {options.data?.genres.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>{t('common.languageField')}</span>
        <select value={filters.language ?? ''} onChange={(event) => setFilter('language', event.target.value)}>
          <option value="">{t('common.all')}</option>
          {options.data?.languages.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>{t('common.decade')}</span>
        <select value={filters.decade ?? ''} onChange={(event) => setFilter('decade', event.target.value)}>
          <option value="">{t('common.all')}</option>
          {options.data?.decades.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>{t('common.region')}</span>
        <select value={filters.region ?? ''} onChange={(event) => setFilter('region', event.target.value)}>
          <option value="">{t('common.all')}</option>
          {options.data?.regions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <button type="button" className="secondary" onClick={resetFilters}>{t('common.resetFilters')}</button>
      <div className="active-filters">
        {Object.entries(filters).filter(([, value]) => Boolean(value)).map(([key, value]) => <span className="badge" key={key}>{key}: {value}</span>)}
      </div>
    </div>
  );
}
