import { useQuery } from '@tanstack/react-query';
import { lyricsApi } from '../api/lyricsApi';

export const useSongSearch = (q: string) =>
  useQuery({ queryKey: ['songs', q], queryFn: () => lyricsApi.searchSongs(q), enabled: q.length > 0 });

export const useSongOptions = () =>
  useQuery({ queryKey: ['song-options'], queryFn: lyricsApi.songOptions });

export const useSimilarSongs = (songId?: string, method = 'tfidf') =>
  useQuery({ queryKey: ['similar', songId, method], queryFn: () => lyricsApi.similarSongs(songId ?? '', method), enabled: Boolean(songId) });

export const useSimilarityExplanations = (songId?: string, method = 'tfidf') =>
  useQuery({ queryKey: ['similar-explanations', songId, method], queryFn: () => lyricsApi.similarityExplanations(songId ?? '', method), enabled: Boolean(songId) });

export const useSimilarityGraph = (songId?: string, method = 'tfidf') =>
  useQuery({ queryKey: ['similarity-graph', songId, method], queryFn: () => lyricsApi.similarityGraph(songId ?? '', method), enabled: Boolean(songId) });
