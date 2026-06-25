import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ArtistCluster } from '../../api/types';

type Props = {
  fingerprint?: Record<string, number>;
  artistId?: string;
  clusters: ArtistCluster[];
};

export function ArtistStyleDeepDive({ fingerprint, artistId, clusters }: Props) {
  const selectedCluster = clusters.find((item) => item.artist_id === artistId)?.cluster;
  const peers = selectedCluster ? clusters.filter((item) => item.cluster === selectedCluster) : clusters;
  const fingerprintRows = Object.entries(fingerprint ?? {})
    .map(([metric, value]) => ({ metric, value }))
    .sort((a, b) => b.value - a.value);
  const clusterRows = ['topic_diversity', 'sentiment_intensity', 'genre_consistency', 'lyrical_complexity_proxy', 'style_uniqueness'].map((metric) => {
    const artistValue = clusters.find((item) => item.artist_id === artistId)?.[metric as keyof ArtistCluster];
    const peerAverage = peers.reduce((sum, item) => sum + Number(item[metric as keyof ArtistCluster] ?? 0), 0) / Math.max(1, peers.length);
    return { metric: metric.split('_').join(' '), artist: Number(artistValue ?? 0), cluster: peerAverage };
  });
  const uniquenessRows = [...clusters]
    .sort((a, b) => b.style_uniqueness - a.style_uniqueness)
    .slice(0, 14)
    .map((item) => ({ name: item.artist_name, uniqueness: item.style_uniqueness, selected: item.artist_id === artistId }));

  return (
    <>
      <div className="two-column">
        <section className="chart-panel">
          <h2>Fingerprint ranking</h2>
          <div className="recharts-panel compact-chart">
            <ResponsiveContainer>
              <BarChart data={fingerprintRows} layout="vertical" margin={{ top: 8, right: 24, left: 90, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
                <XAxis type="number" domain={[0, 1]} />
                <YAxis dataKey="metric" type="category" width={96} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => value.toFixed(3)} />
                <Bar dataKey="value" fill="#1696D2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="chart-panel">
          <h2>Artist vs cluster average</h2>
          <div className="recharts-panel compact-chart">
            <ResponsiveContainer>
              <BarChart data={clusterRows} margin={{ top: 8, right: 24, left: 0, bottom: 52 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
                <XAxis dataKey="metric" angle={-28} textAnchor="end" interval={0} height={74} tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 1]} />
                <Tooltip formatter={(value: number) => value.toFixed(3)} />
                <Bar dataKey="artist" fill="#EC008B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cluster" fill="#1696D2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="chart-panel">
        <h2>Style uniqueness distribution</h2>
        <div className="recharts-panel compact-chart">
          <ResponsiveContainer>
            <BarChart data={uniquenessRows} margin={{ top: 8, right: 24, left: 0, bottom: 58 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
              <XAxis dataKey="name" angle={-28} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 1]} />
              <Tooltip formatter={(value: number) => value.toFixed(3)} />
              <Bar dataKey="uniqueness" radius={[4, 4, 0, 0]}>
                {uniquenessRows.map((row) => <Cell key={row.name} fill={row.selected ? '#EC008B' : '#1696D2'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
