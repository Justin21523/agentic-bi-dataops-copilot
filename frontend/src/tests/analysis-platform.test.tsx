import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatasetWorkflowPage } from '../pages/DatasetWorkflowPage';
import { MachineLearningLabPage } from '../pages/MachineLearningLabPage';

vi.mock('../api/lyricsApi', () => ({
  lyricsApi: {
    datasetProfile: vi.fn().mockResolvedValue({
      dataset_id: 'demo',
      name: 'Demo dataset',
      row_count: 10,
      column_count: 4,
      duplicate_rows: 0,
      missing_cells: 1,
      columns: [{ name: 'genre', dtype: 'object', missing: 0, unique: 3, sample_values: ['pop'] }],
      numeric_summary: {},
      categorical_summary: { genre: [{ value: 'pop', count: 4 }] },
      workflow: [{ step: 'upload', status: 'complete' }, { step: 'inspect', status: 'complete' }, { step: 'clean', status: 'active' }]
    }),
    cleaningPreview: vi.fn().mockResolvedValue({ dataset_id: 'demo', input_rows: 10, output_rows: 10, duplicate_rows_removed: 0, issues: [], recommended_actions: ['Review target column'] }),
    classificationAnalysis: vi.fn().mockResolvedValue({
      dataset_id: 'demo',
      target: 'genre',
      feature_space: 'tfidf_bow',
      baseline: { model_id: 'majority', label: 'Majority', accuracy: 0.5 },
      leakage_audit: { status: 'pass', vectorizer_fit_scope: 'train_split_only', overlap_count: 0 },
      models: [{ model_id: 'decision_tree', label: 'Decision Tree', family: 'classifier', accuracy: 0.8, macro_f1: 0.75, per_class_metrics: { pop: { precision: 1, recall: 1, f1: 1, support: 4 } }, top_features: [{ feature: 'dance', score: 0.8 }], notes: 'demo' }],
      decision_tree: { text: '', nodes: [{ id: 'tree-0', raw_id: 0, left: -1, right: -1, feature: null, threshold: null, samples: 10, prediction: 'pop', depth: 0, is_leaf: true, x_order: 0 }], edges: [], node_count: 1, max_depth: 0 },
      random_forest: { tree_count: 1, feature_importances: [{ feature: 'dance', score: 0.8 }], sample_trees: [{ tree_index: 0, nodes: [{ id: 'forest-0', raw_id: 0, samples: 10, prediction: 'pop', depth: 0, is_leaf: true, x_order: 0 }], edges: [], node_count: 1, max_depth: 0 }] },
      deep_learning: { status: 'planned', methods: ['MLP'], note: 'planned' }
    }),
    clusteringAnalysis: vi.fn().mockResolvedValue({ dataset_id: 'demo', feature_space: 'tfidf', methods: [{ method: 'kmeans', cluster_count: 2, noise_count: 0, silhouette: 0.5, points: [{ song_id: 's1', x: 0, y: 0, cluster: 1, label: 'pop' }] }] }),
    tfidfSummary: vi.fn().mockResolvedValue({ dataset_id: 'demo', method: 'tfidf', terms: [{ term: 'dance', score: 0.8 }] }),
    topicModelSummary: vi.fn().mockResolvedValue({ dataset_id: 'demo', method: 'nmf', topics: [{ topic_id: 1, topic_label: 'dance / light', top_terms: ['dance', 'light'] }], assignments: [] })
  }
}));

function renderWithClient(ui: JSX.Element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('analysis platform pages', () => {
  it('renders dataset workflow profile', async () => {
    renderWithClient(<DatasetWorkflowPage />);
    expect(await screen.findByText('Schema profile')).toBeInTheDocument();
    expect(screen.getAllByText('genre').length).toBeGreaterThan(0);
  });

  it('renders ML Lab model visuals', async () => {
    renderWithClient(<MachineLearningLabPage />);
    expect(await screen.findByText('模型排行榜')).toBeInTheDocument();
    expect(screen.getAllByText('Decision Tree').length).toBeGreaterThan(0);
    expect(screen.getByText('Leakage audit')).toBeInTheDocument();
  });
});
