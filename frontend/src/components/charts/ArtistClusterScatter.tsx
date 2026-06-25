import { useTranslation } from 'react-i18next';
import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { ArtistCluster } from '../../api/types';

type Props = {
  data: ArtistCluster[];
  activeArtistId?: string;
  onSelect: (selection: { artist_id: string; title: string }) => void;
};

const clusterColors: Record<string, string> = {
  'high-distinction': '#1463d9',
  'genre-focused': '#0f766e',
  'cross-style': '#b45309'
};

export function ArtistClusterScatter({ data, activeArtistId, onSelect }: Props) {
  const { t } = useTranslation();
  const clusters = Array.from(new Set(data.map((item) => item.cluster))).sort();
  return (
    <section className="chart-panel">
      <h2>{t('charts.artistClusterScatter')}</h2>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="topic_diversity" name={t('charts.topicDiversity')} domain={[0, 1]} />
          <YAxis type="number" dataKey="style_uniqueness" name={t('charts.styleUniqueness')} domain={[0, 1]} />
          <ZAxis type="number" dataKey="lyrical_complexity_proxy" range={[80, 360]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          {clusters.map((cluster) => (
            <Scatter
              key={cluster}
              name={cluster}
              data={data.filter((item) => item.cluster === cluster)}
              fill={clusterColors[cluster] ?? '#475569'}
              onClick={(point: unknown) => {
                const item = point as ArtistCluster;
                if (!item.artist_id) return;
                onSelect({ artist_id: item.artist_id, title: item.artist_name });
              }}
            >
              {data.filter((item) => item.cluster === cluster).map((item) => (
                <Cell key={item.artist_id} fill={item.artist_id === activeArtistId ? '#be123c' : clusterColors[item.cluster] ?? '#475569'} />
              ))}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        {clusters.map((cluster) => <span key={cluster}><i style={{ background: clusterColors[cluster] ?? '#475569' }} />{cluster}</span>)}
      </div>
    </section>
  );
}
