import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReportWorkspacePage } from '../pages/ReportWorkspacePage';

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
    }
  ]
}));

vi.mock('../hooks/useAnalysis', () => ({
  useAnalysisStories: () => ({ isLoading: false, isError: false, data: { dataset_id: 'demo', scope: 'overview', insights: fixtures.insights } }),
  useAnalysisReport: () => ({
    isLoading: false,
    isError: false,
    data: {
      dataset_id: 'demo',
      filename: 'report.md',
      mode: 'executive',
      markdown: '# Report\n\n## Dataset Summary',
      html: '<article><h1>Report</h1></article>',
      sections: []
    }
  })
}));

describe('ReportWorkspacePage', () => {
  it('renders report previews and selectable insights', () => {
    render(<MemoryRouter><ReportWorkspacePage /></MemoryRouter>);
    expect(screen.getByText('Report Workspace')).toBeInTheDocument();
    expect(screen.getByText('Markdown preview')).toBeInTheDocument();
    expect(screen.getByText('Decision Tree leads genre classification')).toBeInTheDocument();
  });
});
