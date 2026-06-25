import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TopicExplorerPage } from '../pages/TopicExplorerPage';

vi.mock('../api/lyricsApi', () => ({
  lyricsApi: {
    filterOptions: vi.fn().mockResolvedValue({ genres: ['pop'], languages: ['en'], decades: [2020], regions: ['East Asia'] }),
    topics: vi.fn().mockResolvedValue([{ topic_id: 1, topic_label: 'city / light', song_count: 3, average_score: 0.5 }]),
    topicDecade: vi.fn().mockResolvedValue([{ topic_id: 1, topic_label: 'city / light', decade: 2020, song_count: 3, average_score: 0.5 }]),
    topicSongs: vi.fn().mockResolvedValue([{ song_id: 's1', title: 'Derived Track', artist_id: 'a1', artist_name: 'Artist', genre: 'pop', year: 2024, topic_label: 'city / light', topic_score: 0.7 }])
    ,
    drilldownSongs: vi.fn().mockResolvedValue([{ song_id: 's1', title: 'Derived Track', artist_id: 'a1', artist_name: 'Artist', genre: 'pop', year: 2024 }]),
    topicTerms: vi.fn().mockResolvedValue([{ topic_id: 1, topic_label: 'city / light', term: 'city', score: 0.9 }]),
    topicQuality: vi.fn().mockResolvedValue([{ topic_id: 1, topic_label: 'city / light', song_count: 3, average_score: 0.5, coherence: 0.8, top_terms: [{ term: 'city', score: 0.9 }] }])
  }
}));

describe('TopicExplorerPage', () => {
  it('shows related songs after selecting a topic', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><TopicExplorerPage /></QueryClientProvider></MemoryRouter>);
    await userEvent.click(await screen.findByRole('button', { name: 'city / light' }));
    expect(await screen.findByText('Derived Track')).toBeInTheDocument();
  });
});
