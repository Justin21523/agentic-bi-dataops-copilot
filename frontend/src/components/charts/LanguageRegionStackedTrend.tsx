import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LanguageCulture } from '../../api/types';

type StackMode = 'language' | 'region';

type Props = {
  data: LanguageCulture[];
  onSelect: (selection: { decade: string; language?: string; region?: string; title: string }) => void;
};

const colors = ['#1463d9', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#475569', '#047857'];

export function LanguageRegionStackedTrend({ data, onSelect }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<StackMode>('language');
  const series = useMemo(() => Array.from(new Set(data.map((item) => mode === 'language' ? item.language : item.region))).sort(), [data, mode]);
  const chartData = useMemo(() => {
    const byDecade = new Map<number, Record<string, string | number>>();
    for (const item of data) {
      const row = byDecade.get(item.decade) ?? { decade: item.decade };
      const key = mode === 'language' ? item.language : item.region;
      row[key] = Number(row[key] ?? 0) + item.song_count;
      byDecade.set(item.decade, row);
    }
    return Array.from(byDecade.values()).sort((a, b) => Number(a.decade) - Number(b.decade));
  }, [data, mode]);

  return (
    <section className="chart-panel">
      <div className="chart-heading-row">
        <h2>{t('charts.languageRegionStackedTrend')}</h2>
        <div className="segmented-control">
          <button type="button" className={mode === 'language' ? 'active' : ''} onClick={() => setMode('language')}>{t('common.languageField')}</button>
          <button type="button" className={mode === 'region' ? 'active' : ''} onClick={() => setMode('region')}>{t('common.region')}</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="decade" />
          <YAxis />
          <Tooltip />
          {series.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="culture"
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.55}
              onClick={(event: unknown) => {
                const payload = event as { payload?: { decade?: number } };
                const decade = String(payload.payload?.decade ?? '');
                if (!decade) return;
                onSelect({
                  decade,
                  language: mode === 'language' ? key : undefined,
                  region: mode === 'region' ? key : undefined,
                  title: `${key} / ${decade}`
                });
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
