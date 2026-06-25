import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DrilldownPanel } from '../components/charts/DrilldownPanel';
import { GenreSentimentHeatmap } from '../components/charts/GenreSentimentHeatmap';

describe('chart drill-down interactions', () => {
  it('selects a heatmap cell and renders metadata-only drill-down content', async () => {
    const onSelect = vi.fn();
    render(
      <>
        <GenreSentimentHeatmap
          data={[{ genre: 'pop', decade: 2020, song_count: 3, sentiment_score: 0.4, positive_count: 2, neutral_count: 1, negative_count: 0 }]}
          onSelect={onSelect}
        />
        <DrilldownPanel
          title="pop / positive"
          songs={[{ song_id: 's1', title: 'Derived Track', artist_id: 'a1', artist_name: 'Artist', genre: 'pop', year: 2024 }]}
          onClose={vi.fn()}
        />
      </>
    );

    await userEvent.click(screen.getByRole('button', { name: /67% 2 songs/i }));
    expect(onSelect).toHaveBeenCalledWith({ genre: 'pop', sentiment_label: 'positive', title: 'pop / positive' });
    expect(screen.getByText('Derived Track')).toBeInTheDocument();
    expect(screen.queryByText(/lyrics_text|full_lyrics|raw_lyrics|lyric_lines/i)).not.toBeInTheDocument();
  });
});
