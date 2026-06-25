import { useTranslation } from 'react-i18next';
import type { SimilarSong } from '../../api/types';

export function SimilarityNetwork({ data }: { data: SimilarSong[] }) {
  const { t } = useTranslation();
  const center = { x: 180, y: 150 };
  const radius = 105;
  return (
    <section className="chart-panel network">
      <h2>{t('charts.similarityNetwork')}</h2>
      <svg className="network-canvas" viewBox="0 0 360 300" role="img" aria-label={t('charts.similarityNetwork')}>
        <circle cx={center.x} cy={center.y} r="30" className="network-node source" />
        <text x={center.x} y={center.y + 4} textAnchor="middle">Seed</text>
        {data.map((item, index) => {
          const angle = (Math.PI * 2 * index) / Math.max(1, data.length) - Math.PI / 2;
          const x = center.x + Math.cos(angle) * radius;
          const y = center.y + Math.sin(angle) * radius;
          const width = 1 + item.similarity_score * 5;
          return (
            <g key={item.similar_song_id}>
              <line x1={center.x} y1={center.y} x2={x} y2={y} className="network-edge" strokeWidth={width} />
              <circle cx={x} cy={y} r="24" className="network-node target" />
              <text x={x} y={y + 4} textAnchor="middle">{Math.round(item.similarity_score * 100)}%</text>
            </g>
          );
        })}
      </svg>
      <div className="network-list">{data.map((item) => <span key={item.similar_song_id}>{item.title}</span>)}</div>
    </section>
  );
}
