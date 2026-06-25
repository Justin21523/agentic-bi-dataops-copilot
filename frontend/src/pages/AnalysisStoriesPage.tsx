import { useState } from 'react';
import { ExecutiveSummary } from '../components/analysis/ExecutiveSummary';
import { InsightCardGrid } from '../components/analysis/InsightCardGrid';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import type { StoryScope } from '../api/types';
import { useAnalysisStories } from '../hooks/useAnalysis';

const scopes: Array<{ key: StoryScope; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'genre', label: 'Genre classification' },
  { key: 'similarity', label: 'Similarity / recommendation' },
  { key: 'topic', label: 'Topic evolution' },
  { key: 'artist', label: 'Artist style' },
  { key: 'data_quality', label: 'Data quality' }
];

export function AnalysisStoriesPage() {
  const [scope, setScope] = useState<StoryScope>('overview');
  const stories = useAnalysisStories(scope);
  if (stories.isLoading) return <LoadingState />;
  if (stories.isError || !stories.data) return <ErrorState />;
  return (
    <section className="page">
      <div data-guide-anchor="story-builder">
        <ExecutiveSummary
        title="Analysis Story Builder"
        body="The platform converts model scores, data quality checks, topic signals, and similarity structure into readable insights with evidence and next actions."
        actions={['5-8 insight cards', 'Evidence-linked charts', 'Severity and confidence']}
        />
      </div>
      <div className="tab-strip">
        {scopes.map((item) => (
          <button className={scope === item.key ? 'active' : 'secondary'} key={item.key} onClick={() => setScope(item.key)} type="button">
            {item.label}
          </button>
        ))}
      </div>
      <InsightCardGrid insights={stories.data.insights} />
    </section>
  );
}
