import { useQuery } from '@tanstack/react-query';
import { lyricsApi } from '../api/lyricsApi';
import type { DashboardFilters } from './useUrlFilters';

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: lyricsApi.overview });
export const useFilterOptions = () => useQuery({ queryKey: ['filter-options'], queryFn: lyricsApi.filterOptions });
export const useHighlights = () => useQuery({ queryKey: ['highlights'], queryFn: lyricsApi.highlights });
export const useTopics = (filters?: DashboardFilters) => useQuery({ queryKey: ['topics', filters], queryFn: () => lyricsApi.topics(filters) });
export const useTopicSongs = (topicId?: number) =>
  useQuery({ queryKey: ['topic-songs', topicId], queryFn: () => lyricsApi.topicSongs(topicId ?? 0), enabled: topicId !== undefined });
export const useTopicTerms = (topicId?: number) =>
  useQuery({ queryKey: ['topic-terms', topicId], queryFn: () => lyricsApi.topicTerms(topicId ?? 0), enabled: topicId !== undefined });
export const useTopicQuality = () => useQuery({ queryKey: ['topic-quality'], queryFn: lyricsApi.topicQuality });
export const useDrilldownSongs = (filters?: DashboardFilters & { term?: string; topic_id?: number; sentiment_label?: string; artist_id?: string; predicted_genre?: string }) =>
  useQuery({ queryKey: ['drilldown-songs', filters], queryFn: () => lyricsApi.drilldownSongs(filters), enabled: Boolean(filters) });
export const useSentimentTrends = (filters?: DashboardFilters) => useQuery({ queryKey: ['sentiment-trends', filters], queryFn: () => lyricsApi.sentimentTrends(filters) });
export const useYearlyTerms = (filters?: DashboardFilters) => useQuery({ queryKey: ['yearly-terms', filters], queryFn: () => lyricsApi.yearlyTerms(filters) });
export const useDecadeTrends = (filters?: DashboardFilters) => useQuery({ queryKey: ['decade-trends', filters], queryFn: () => lyricsApi.decadeTrends(filters) });
export const useGenreSentiment = (filters?: DashboardFilters) => useQuery({ queryKey: ['genre-sentiment', filters], queryFn: () => lyricsApi.genreSentiment(filters) });
export const useTopicDecade = (filters?: DashboardFilters) => useQuery({ queryKey: ['topic-decade', filters], queryFn: () => lyricsApi.topicDecade(filters) });
export const useLanguageCulture = (filters?: DashboardFilters) => useQuery({ queryKey: ['language-culture', filters], queryFn: () => lyricsApi.languageCulture(filters) });
export const useArtistStyleClusters = (filters?: DashboardFilters) => useQuery({ queryKey: ['artist-style-clusters', filters], queryFn: () => lyricsApi.artistStyleClusters(filters) });
export const useGenreLeakage = (filters?: DashboardFilters) => useQuery({ queryKey: ['genre-leakage', filters], queryFn: () => lyricsApi.genreLeakage(filters) });
export const useGenres = () => useQuery({ queryKey: ['genres'], queryFn: lyricsApi.genres });
export const useLanguages = () => useQuery({ queryKey: ['languages'], queryFn: lyricsApi.languages });
export const useEvaluation = () => useQuery({ queryKey: ['evaluation'], queryFn: lyricsApi.evaluation });
export const useDataQualityReport = () => useQuery({ queryKey: ['data-quality-report'], queryFn: lyricsApi.dataQualityReport });
