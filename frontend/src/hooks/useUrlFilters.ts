import { useSearchParams } from 'react-router-dom';

export type DashboardFilters = {
  genre?: string;
  language?: string;
  decade?: string;
  region?: string;
};

export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const filters: DashboardFilters = {
    genre: params.get('genre') || undefined,
    language: params.get('language') || undefined,
    decade: params.get('decade') || undefined,
    region: params.get('region') || undefined
  };
  const setFilter = (key: keyof DashboardFilters, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const resetFilters = () => setParams(new URLSearchParams());
  return { filters, setFilter, resetFilters };
}
