import { useTranslation } from 'react-i18next';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

export function StyleRadarChart({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation();
  const rows = Object.entries(data).map(([metric, value]) => ({ metric, value }));
  return (
    <section className="chart-panel">
      <h2>{t('charts.styleFingerprint')}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={rows}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <Tooltip />
          <Radar dataKey="value" fill="#1696D2" fillOpacity={0.26} stroke="#0A4B69" />
        </RadarChart>
      </ResponsiveContainer>
    </section>
  );
}
