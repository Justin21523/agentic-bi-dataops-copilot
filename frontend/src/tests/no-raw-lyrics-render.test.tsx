import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SongResultCard } from '../components/songs/SongResultCard';
import { renderWithQuery } from './test-utils';

describe('copyright-safe rendering', () => {
  it('renders metadata without complete lyric text', () => {
    renderWithQuery(<SongResultCard song={{ song_id: 's1', title: 'Derived Track', artist_id: 'a1', artist_name: 'Artist', genre: 'pop', year: 2024 }} />);
    expect(screen.getByText('Derived Track')).toBeInTheDocument();
    expect(screen.queryByText(/lyrics_text|full_lyrics|raw_lyrics|lyric_lines/i)).not.toBeInTheDocument();
  });
});
