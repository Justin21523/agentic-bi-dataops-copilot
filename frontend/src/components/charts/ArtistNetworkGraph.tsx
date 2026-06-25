import type { ArtistCluster } from '../../api/types';

const colors: Record<string, string> = {
  'high-distinction': '#1696D2',
  'genre-focused': '#55B748',
  'cross-style': '#FDBF11'
};

export function ArtistNetworkGraph({ data = [] }: { data?: ArtistCluster[] }) {
  const nodes = data.slice(0, 10);
  const center = { x: 260, y: 170 };
  const radius = 118;
  if (!nodes.length) {
    return (
      <section className="chart-panel" data-guide-anchor="artist-network">
        <h2>Artist style network</h2>
        <div className="empty-network">
          <strong>No artist network yet</strong>
          <p>Load sample data or upload safe metadata to compute artist style clusters and peer links.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="chart-panel" data-guide-anchor="artist-network">
      <h2>Artist style network</h2>
      <svg className="artist-network-svg" viewBox="0 0 560 360" role="img" aria-label="Artist style network">
        {nodes.map((item, index) => {
          const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
          const x = center.x + Math.cos(angle) * radius;
          const y = center.y + Math.sin(angle) * radius;
          const width = 1 + item.genre_consistency * 4;
          return (
            <g key={`edge-${item.artist_id}`}>
              <line x1={center.x} y1={center.y} x2={x} y2={y} stroke={colors[item.cluster] ?? '#607284'} strokeOpacity="0.35" strokeWidth={width} />
            </g>
          );
        })}
        <circle cx={center.x} cy={center.y} r="34" fill="#0A4B69" />
        <text x={center.x} y={center.y + 4} textAnchor="middle" fill="#fff" fontSize="12">Style hub</text>
        {nodes.map((item, index) => {
          const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
          const x = center.x + Math.cos(angle) * radius;
          const y = center.y + Math.sin(angle) * radius;
          return (
            <g key={item.artist_id}>
              <circle cx={x} cy={y} r={14 + item.style_uniqueness * 12} fill={colors[item.cluster] ?? '#607284'} opacity="0.88" />
              <text x={x} y={y + 34} textAnchor="middle" fontSize="11" fill="#243442">{item.artist_name.slice(0, 16)}</text>
            </g>
          );
        })}
      </svg>
      <p className="chart-note">Node size represents style uniqueness; edge width follows genre consistency. This is a derived-feature network, not a lyric display.</p>
    </section>
  );
}
