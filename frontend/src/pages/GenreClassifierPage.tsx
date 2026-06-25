import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lyricsApi } from '../api/lyricsApi';
import { ExplanationPanel } from '../components/common/ExplanationPanel';

const presets: Record<string, Record<string, number>> = {
  'Dance neon': { dance: 0.86, light: 0.68, pulse: 0.74, city: 0.52, guitar: 0.12, acoustic: 0.08 },
  'Acoustic folk': { dance: 0.18, light: 0.42, pulse: 0.2, city: 0.18, guitar: 0.78, acoustic: 0.86 },
  'Rock drive': { dance: 0.34, light: 0.24, pulse: 0.71, city: 0.39, guitar: 0.82, acoustic: 0.2 },
  'Ambient pop': { dance: 0.42, light: 0.82, pulse: 0.27, city: 0.44, guitar: 0.18, acoustic: 0.32 }
};

export function GenreClassifierPage() {
  const { t } = useTranslation();
  const [features, setFeatures] = useState<Record<string, number>>(presets['Dance neon']);
  const mutation = useMutation({ mutationFn: () => lyricsApi.explainGenrePrediction(features) });
  const scores = Object.entries(mutation.data?.scores ?? {})
    .map(([genre, score]) => ({ genre, score }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="page">
      <div className="two-column">
        <section className="content-panel">
          <h2>{t('pages.genre.sampleVector')}</h2>
          <div className="state-chip-row">
            {Object.entries(presets).map(([label, values]) => (
              <button className="secondary compact-button" type="button" key={label} onClick={() => setFeatures(values)}>{label}</button>
            ))}
          </div>
          <div className="feature-editor">
            {Object.entries(features).map(([name, value]) => (
              <label key={name}>
                <span>{name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(event) => setFeatures((current) => ({ ...current, [name]: Number(event.target.value) }))}
                />
                <strong>{value.toFixed(2)}</strong>
              </label>
            ))}
          </div>
          <button type="button" onClick={() => mutation.mutate()}>{t('pages.genre.predict')}</button>
        </section>
        <section className="chart-panel">
          <div className="chart-heading-row">
            <h2>Genre probability distribution</h2>
            {mutation.data && <span className="badge success">{mutation.data.predicted_genre} {(mutation.data.confidence * 100).toFixed(1)}%</span>}
          </div>
          <div className="recharts-panel">
            <ResponsiveContainer>
              <BarChart data={scores} layout="vertical" margin={{ top: 8, right: 24, left: 80, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e1e8" />
                <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
                <YAxis dataKey="genre" type="category" width={92} />
                <Tooltip formatter={(value: number) => value.toFixed(3)} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {scores.map((row) => <Cell key={row.genre} fill={row.genre === mutation.data?.predicted_genre ? '#EC008B' : '#1696D2'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      {mutation.data && (
        <div className="two-column">
          <section className="chart-panel">
            <h2>Why this prediction</h2>
            <div className="list-panel">
              {mutation.data.top_terms.map((term) => (
                <div key={term.term}>
                  <strong>{term.term}</strong>
                  <div className="progress-bar"><span style={{ width: `${Math.min(100, Math.abs(term.weight) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section className="content-panel">
            <h2>Nearest training examples</h2>
            <div className="list-panel">
              {mutation.data.nearest_examples.map((song) => (
                <article className="list-row" key={song.song_id}>
                  <strong>{song.title}</strong>
                  <span>{song.genre} · {song.year}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      <ExplanationPanel
        title="Genre prediction interpretation"
        what="The classifier converts the feature vector into a probability distribution over genres."
        how="Move sliders to change derived term weights, then compare which genre probability rises or falls."
        why="This makes prediction behavior visible without exposing complete lyrics."
        caveat="This interactive endpoint is demo inference; formal evaluation uses held-out train/test splits."
      />
      <section className="content-panel"><p>{mutation.data?.leakage_note ?? t('pages.genre.limitations')}</p></section>
    </section>
  );
}
