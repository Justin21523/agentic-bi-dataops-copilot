import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalysisStoriesPage } from '../pages/AnalysisStoriesPage';
import { DataLineagePage } from '../pages/DataLineagePage';
import { ExplainabilityCenterPage } from '../pages/ExplainabilityCenterPage';

const fixtures = vi.hoisted(() => ({
  insights: [
    {
      id: 'genre-best-model',
      story_type: 'genre',
      title: 'Decision Tree leads genre classification',
      summary: 'The strongest held-out classifier has readable evidence.',
      severity: 'high',
      confidence: 'High confidence',
      evidence: [{ label: 'Model comparison', metric: 'macro_f1', value: 0.8, route: '/ml-lab', anchor: 'classification' }],
      next_action: 'Inspect per-class metrics.'
    },
    {
      id: 'data-quality',
      story_type: 'data_quality',
      title: 'Data quality is ready',
      summary: 'The active dataset has safe derived features.',
      severity: 'info',
      confidence: 'High confidence',
      evidence: [{ label: 'Schema profile', metric: 'missing_cells', value: 0, route: '/workflow', anchor: 'inspect' }],
      next_action: 'Review missing values.'
    }
  ]
}));

vi.mock('../api/lyricsApi', () => ({
  lyricsApi: {
    analysisStories: vi.fn().mockResolvedValue({ dataset_id: 'demo', scope: 'overview', insights: fixtures.insights }),
    explainabilityCenter: vi.fn().mockResolvedValue({
      dataset_id: 'demo',
      mode: 'heldout_split',
      selected_song: { song_id: 's1', title: 'Derived Track', genre: 'pop' },
      heldout_options: [{ song_id: 's1', title: 'Derived Track', genre: 'pop' }],
      actual_genre: 'pop',
      feature_comparison: [{ model_id: 'logistic_regression', label: 'Logistic Regression', accuracy: 0.8, macro_f1: 0.75, top_features: [{ feature: 'dance', score: 0.8 }], signed_terms: { positive: [{ term: 'dance', score: 0.4 }], negative: [] } }],
      per_class: [{ label: 'pop', metrics: { f1: 0.9, support: 4 }, top_terms: [{ term: 'dance', score: 0.4 }], confused_with: [] }],
      model_disagreement: [{ model_id: 'logistic_regression', label: 'Logistic Regression', prediction: 'pop', matches_actual: true }],
      error_explanations: [{ song: { song_id: 's2', title: 'Neighbor Track', genre: 'rock' }, actual: 'rock', predictions: { logistic_regression: 'pop' } }],
      leakage_audit: { status: 'pass', overlap_count: 0 },
      improvement_advice: ['Collect more examples.']
    }),
    lineageReplay: vi.fn().mockResolvedValue({
      dataset_id: 'demo',
      selected_song: { song_id: 's1', title: 'Derived Track', genre: 'pop' },
      song_options: [{ song_id: 's1', title: 'Derived Track', genre: 'pop' }],
      steps: [{ key: 'raw_metadata', label: 'Raw metadata', input: { source: 'songs.csv' }, output: { title: 'Derived Track' }, field_changes: { kept: ['title'], removed: ['full text'] }, explanation: 'Safe metadata only.', status: 'complete' }]
    }),
    analysisReport: vi.fn().mockResolvedValue({ dataset_id: 'demo', filename: 'report.md', mode: 'executive', markdown: '# Report\\n\\n## Dataset Summary', html: '<article><h1>Report</h1></article>', sections: [] })
  }
}));

function renderWithProviders(ui: JSX.Element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter><QueryClientProvider client={client}>{ui}</QueryClientProvider></MemoryRouter>);
}

afterEach(() => cleanup());

describe('explainability platform pages', () => {
  it('renders analysis story builder', async () => {
    renderWithProviders(<AnalysisStoriesPage />);
    expect(await screen.findByText('Analysis Story Builder')).toBeInTheDocument();
    expect(await screen.findByText('Decision Tree leads genre classification')).toBeInTheDocument();
  });

  it('renders explainability center', async () => {
    renderWithProviders(<ExplainabilityCenterPage />);
    expect(await screen.findByText('Model Explainability Center')).toBeInTheDocument();
    expect(await screen.findByText('Model disagreement view')).toBeInTheDocument();
  });

  it('renders lineage replay', async () => {
    renderWithProviders(<DataLineagePage />);
    expect(await screen.findByText('Dataset Journey Replay')).toBeInTheDocument();
    expect((await screen.findAllByText('Raw metadata')).length).toBeGreaterThan(0);
  });
});
