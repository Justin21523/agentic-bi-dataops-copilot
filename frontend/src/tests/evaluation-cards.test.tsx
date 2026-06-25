import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvaluationPage } from '../pages/EvaluationPage';

vi.mock('../api/lyricsApi', () => ({
  lyricsApi: {
    evaluation: vi.fn().mockResolvedValue({ accuracy: 0.91, macro_f1: 0.88, recall_at_k: 0.8, ndcg_at_k: 0.77, topic_coherence: 0.42, safety: { status: 'pass' }, confusion_matrix: { labels: ['pop'], matrix: [[1]] }, per_genre_metrics: { pop: { f1: 1, precision: 1, recall: 1 } }, retrieval_examples: [], good_examples: [], bad_examples: [], majority_baseline_accuracy: 0.5, tfidf_accuracy: 0.91, accuracy_lift: 0.41 }),
    classificationAnalysis: vi.fn().mockResolvedValue({
      dataset_id: 'demo',
      target: 'genre',
      feature_space: 'tfidf_bow',
      baseline: { model_id: 'majority', label: 'Majority', accuracy: 0.5 },
      leakage_audit: { status: 'pass', vectorizer_fit_scope: 'train_split_only', overlap_count: 0 },
      models: [{ model_id: 'logistic_regression', label: 'Logistic Regression', family: 'linear', accuracy: 0.91, macro_f1: 0.88, top_features: [] }],
      decision_tree: { text: '', nodes: [], edges: [], node_count: 0, max_depth: 0 },
      deep_learning: { status: 'planned', methods: [], note: '' }
    }),
    drilldownSongs: vi.fn().mockResolvedValue([]),
    dataQualityReport: vi.fn().mockResolvedValue({ status: 'pass', tables: { songs: { rows: 1, columns: [] } }, issues: [], safety: { no_raw_lyrics: true } })
  }
}));

describe('EvaluationPage', () => {
  it('renders chart-first model evaluation instead of only raw JSON', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><EvaluationPage /></QueryClientProvider>);
    expect((await screen.findAllByText('Model comparison')).length).toBeGreaterThan(0);
    expect(screen.getByText('Leakage audit')).toBeInTheDocument();
    expect((await screen.findAllByText('pass')).length).toBeGreaterThan(0);
  });
});
