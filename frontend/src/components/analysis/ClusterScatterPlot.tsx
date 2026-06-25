import { useMemo } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClusterPoint, ClusterProfile } from '../../api/types';

const colors = ['#1696d2', '#fdbf11', '#ec008b', '#2e7d32', '#7a5cfa', '#6b7280'];

export function ClusterScatterPlot({ points, profiles = [], silhouette, note }: { points: ClusterPoint[]; profiles?: ClusterProfile[]; silhouette?: number | null; note?: string }) {
  const { t } = useTranslation();
  const [activeCluster, setActiveCluster] = useState<number | undefined>();
  const bounds = useMemo(() => {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      minX: Math.min(...xs, 0),
      maxX: Math.max(...xs, 1),
      minY: Math.min(...ys, 0),
      maxY: Math.max(...ys, 1)
    };
  }, [points]);
  const scaleX = (x: number) => 36 + ((x - bounds.minX) / Math.max(0.001, bounds.maxX - bounds.minX)) * 428;
  const scaleY = (y: number) => 320 - ((y - bounds.minY) / Math.max(0.001, bounds.maxY - bounds.minY)) * 280;
  const activeProfile = profiles.find((profile) => profile.cluster === activeCluster) ?? profiles[0];
  return (
    <section className="chart-panel" data-journey-anchor="cluster">
      <div className="chart-heading-row">
        <h2>{t('analysis.clusterProjection')}</h2>
        <span className="badge">Silhouette {silhouette ?? 'n/a'}</span>
      </div>
      <div className="cluster-layout">
        <svg className="scatter-svg" viewBox="0 0 500 360" role="img" aria-label={t('analysis.clusterProjection')}>
          <line x1="36" y1="320" x2="468" y2="320" stroke="#d7dee8" />
          <line x1="36" y1="40" x2="36" y2="320" stroke="#d7dee8" />
          {profiles.filter((profile) => profile.cluster >= 0).map((profile) => (
            <g key={`centroid-${profile.cluster}`} onClick={() => setActiveCluster(profile.cluster)} className="cluster-centroid">
              <circle cx={scaleX(profile.centroid.x)} cy={scaleY(profile.centroid.y)} r="18" fill={colors[profile.cluster % colors.length]} opacity="0.12" />
              <path d={`M ${scaleX(profile.centroid.x)} ${scaleY(profile.centroid.y) - 10} L ${scaleX(profile.centroid.x) + 8} ${scaleY(profile.centroid.y) + 8} L ${scaleX(profile.centroid.x) - 10} ${scaleY(profile.centroid.y) - 2} L ${scaleX(profile.centroid.x) + 10} ${scaleY(profile.centroid.y) - 2} L ${scaleX(profile.centroid.x) - 8} ${scaleY(profile.centroid.y) + 8} Z`} fill={colors[profile.cluster % colors.length]} />
            </g>
          ))}
          {points.map((point) => (
            <circle
              key={point.song_id}
              cx={scaleX(point.x)}
              cy={scaleY(point.y)}
              r={point.cluster === activeCluster ? 8 : 5}
              fill={point.cluster < 0 ? '#8290a3' : colors[point.cluster % colors.length]}
              opacity={activeCluster === undefined || point.cluster === activeCluster ? 0.88 : 0.28}
              onClick={() => setActiveCluster(point.cluster)}
            >
              <title>{`${point.song_id} · ${t('common.cluster')}: ${point.cluster} · ${point.label}`}</title>
            </circle>
          ))}
        </svg>
        <aside className="cluster-profile">
          <h3>Cluster profile</h3>
          {activeProfile && (
            <>
              <strong>Cluster {activeProfile.cluster}</strong>
              <span>{activeProfile.size} songs · dominant label: {activeProfile.dominant_label}</span>
              <div className="list-panel">
                {activeProfile.label_distribution.map((item) => (
                  <div key={item.label}>
                    <strong>{item.label}</strong>
                    <div className="progress-bar"><span style={{ width: `${Math.min(100, (item.count / activeProfile.size) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="cluster-detail-grid">
                <div>
                  <strong>Representative songs</strong>
                  {(activeProfile.representative_songs ?? []).slice(0, 5).map((song) => <span key={song.song_id}>{song.title ?? song.song_id} · {song.genre}</span>)}
                </div>
                <div>
                  <strong>Top terms</strong>
                  {(activeProfile.top_terms ?? []).slice(0, 6).map((term) => <span key={term.term}>{term.term} {term.score.toFixed(2)}</span>)}
                </div>
                <div>
                  <strong>Topic mix</strong>
                  {(activeProfile.topic_mix ?? []).slice(0, 5).map((topic) => <span key={topic.topic_label}>{topic.topic_label} ({topic.count})</span>)}
                </div>
                <div>
                  <strong>Distinctive terms</strong>
                  {(activeProfile.contrast_terms ?? []).slice(0, 6).map((term) => <span key={term.term}>{term.term} +{term.score.toFixed(2)}</span>)}
                </div>
              </div>
            </>
          )}
          <p>{note}</p>
        </aside>
      </div>
    </section>
  );
}
