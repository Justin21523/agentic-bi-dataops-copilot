import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { YearlyTerm } from '../../api/types';

export function YearlyTermsChart({ data }: { data: YearlyTerm[] }) {
  const { t } = useTranslation();
  return (
    <section className="chart-panel">
      <h2>{t('charts.yearlyTerms')}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.slice(0, 20)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="term" />
          <YAxis />
          <Tooltip labelFormatter={() => t('charts.yearlyTerms')} />
          <Bar dataKey="score" fill="#b45309" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
