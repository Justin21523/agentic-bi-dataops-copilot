import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { lyricsApi } from '../api/lyricsApi';
import { SimilarSongsPage } from '../pages/SimilarSongsPage';

vi.mock('../api/lyricsApi', () => ({
  lyricsApi: {
    songOptions: vi.fn().mockResolvedValue([{ song_id: 's1', title: 'Derived Track', artist_name: 'Artist', genre: 'pop', year: 2024 }]),
    similarSongs: vi.fn().mockResolvedValue([{ song_id: 's1', similar_song_id: 's2', title: 'Neighbor Track', artist_id: 'a2', artist_name: 'Other', genre: 'pop', year: 2023, similarity_score: 0.82, method: 'tfidf' }]),
    similarityGraph: vi.fn().mockResolvedValue({
      source: { song_id: 's1', title: 'Derived Track' },
      nodes: [
        { id: 's1', role: 'source', type: 'song', label: 'Derived Track', genre: 'pop' },
        { id: 's2', role: 'target', type: 'song', label: 'Neighbor Track', genre: 'pop' },
        { id: 'terms-s2', role: 'shared_terms', type: 'evidence', label: 'dance' }
      ],
      edges: [{ id: 's1-s2', source: 's1', target: 's2', weight: 0.82, label: '0.82', genre_match: true }],
      explanations: [{ song_id: 's1', similar_song_id: 's2', title: 'Neighbor Track', artist_id: 'a2', artist_name: 'Other', genre: 'pop', year: 2023, similarity_score: 0.82, method: 'tfidf', shared_terms: ['dance'], shared_topics: [], genre_match: true }]
    }),
    genreLeakage: vi.fn().mockResolvedValue([{ method: 'tfidf', source_genre: 'pop', similar_genre: 'pop', pair_count: 5, similarity_score: 0.8, same_genre_rate: 1 }])
  }
}));

describe('song similarity', () => {
  it('selects a song and shows similar song graph content', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SimilarSongsPage /></QueryClientProvider>);
    await waitFor(() => expect(lyricsApi.songOptions).toHaveBeenCalled());
    await userEvent.selectOptions(await screen.findByLabelText('Song'), 's1');
    expect((await screen.findAllByText('Neighbor Track')).length).toBeGreaterThan(0);
    await userEvent.selectOptions(screen.getByLabelText('相似度方法'), 'topic_vector');
    expect(screen.getByText('Topic Vector')).toBeInTheDocument();
  });
});
