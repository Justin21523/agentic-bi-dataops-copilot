import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SimilarityFlowGraph } from '../components/charts/SimilarityFlowGraph';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ExplanationPanel } from '../components/common/ExplanationPanel';
import { SimilarSongList } from '../components/songs/SimilarSongList';
import { useGenreLeakage } from '../hooks/useAnalytics';
import { useSimilarityGraph, useSimilarSongs, useSongOptions } from '../hooks/useSongs';

export function SimilarSongsPage() {
  const { t } = useTranslation();
  const options = useSongOptions();
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [method, setMethod] = useState('tfidf');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const effectiveSongId = selectedSongId || options.data?.[0]?.song_id;
  const selectedOption = options.data?.find((song) => song.song_id === effectiveSongId);
  const similar = useSimilarSongs(effectiveSongId, method);
  const graph = useSimilarityGraph(effectiveSongId, method);
  const leakage = useGenreLeakage();
  if (options.isError || similar.isError || graph.isError) return <ErrorState />;
  const selectedEdge = graph.data?.edges.find((edge) => edge.id === selectedEdgeId);
  const selectedTargetId = selectedEdge?.source === effectiveSongId ? selectedEdge?.target : selectedEdge?.source;
  const selectedExplanation = graph.data?.explanations.find((item) => item.similar_song_id === selectedTargetId);
  return (
    <section className="page">
      <div className="filter-panel">
        <label>
          <span>Song</span>
          <select value={effectiveSongId ?? ''} onChange={(event) => { setSelectedSongId(event.target.value); setSelectedEdgeId(undefined); }}>
            {options.data?.map((song) => (
              <option key={song.song_id} value={song.song_id}>{song.title} · {song.artist_name} · {song.genre}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('pages.similar.method')}</span>
          <select value={method} onChange={(event) => { setMethod(event.target.value); setSelectedEdgeId(undefined); }}>
            <option value="tfidf">{t('pages.similar.tfidf')}</option>
            <option value="topic_vector">{t('pages.similar.topicVector')}</option>
            <option value="style_embedding">{t('pages.similar.styleEmbedding')}</option>
          </select>
        </label>
      </div>
      <div className="analytics-layout">
        <div className="analytics-main">
          <div data-guide-anchor="similarity-network">
            {graph.data ? <SimilarityFlowGraph graph={graph.data} onEdgeSelect={setSelectedEdgeId} /> : <EmptyState />}
          </div>
          {similar.data?.length ? <SimilarSongList songs={similar.data} /> : <EmptyState />}
        </div>
        <aside className="drilldown-panel" data-guide-anchor="similarity-evidence">
          <div className="drilldown-header">
            <div>
              <h2>{selectedOption?.title ?? t('pages.similar.whySimilar')}</h2>
              <p>{selectedOption?.artist_name} · {selectedOption?.genre} · {selectedOption?.year}</p>
            </div>
          </div>
          {selectedExplanation ? (
            <div className="list-panel">
              <article className="list-row">
                <strong>{selectedExplanation.title}</strong>
                <span>{t('pages.similar.genreMatch')}: {String(selectedExplanation.genre_match)}</span>
                <span>Similarity: {selectedExplanation.similarity_score}</span>
              </article>
              <article className="list-row">
                <strong>{t('pages.similar.sharedTerms')}</strong>
                <span>{selectedExplanation.shared_terms.join(', ') || 'No shared high-weight terms'}</span>
              </article>
              <article className="list-row">
                <strong>Shared topics</strong>
                <span>{selectedExplanation.shared_topics.map((topic) => topic.topic_label).join(', ') || 'No shared dominant topics'}</span>
              </article>
            </div>
          ) : (
            <p>{t('charts.drilldownSubtitle')}</p>
          )}
        </aside>
      </div>
      <section className="content-panel">
        <h2>{t('pages.analysis.genreLeakage')}</h2>
        <table><tbody>{leakage.data?.filter((item) => item.method === method).slice(0, 8).map((item) => <tr key={`${item.method}-${item.source_genre}-${item.similar_genre}`}><td>{item.source_genre}</td><td>{item.similar_genre}</td><td>{Math.round(item.same_genre_rate * 100)}%</td></tr>)}</tbody></table>
        <p className="chart-note">High same-genre rate means recommendations stay stylistically coherent; cross-genre edges can be useful discovery but need stronger explanation.</p>
      </section>
      <ExplanationPanel
        title="Similarity interpretation"
        what="The network connects a seed song to neighbors through shared terms, shared topics, or style vectors."
        how="Thicker edges mean stronger similarity; the side panel explains selected connections using metadata-only evidence."
        why="This separates 'these songs are close' from 'why the system thinks they are close'."
        caveat="Similarity can reflect genre leakage; compare methods and inspect mismatch edges before using recommendations."
      />
      <section className="content-panel"><h2>{t('pages.analysis.modelLimitations')}</h2><p>{t('pages.genre.limitations')}</p></section>
    </section>
  );
}
