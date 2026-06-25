import { apiClient } from './client';
import type { AnalysisStories, Artist, ArtistCluster, BucketMetric, ClassificationAnalysis, CleaningPreview, ClusteringAnalysis, DataQualityReport, DatasetProfile, DecadeTrend, ExplainabilityPayload, FilterOptions, GenreLeakage, GenrePredictionExplanation, GenreSentiment, HighlightPayload, LanguageCulture, LineagePayload, Overview, ReportPayload, SimilarityExplanation, SimilarityGraph, SimilarSong, Song, SongOption, StoryScope, TfidfSummary, TopicDecade, TopicModelSummary, TopicQuality, TopicSong, TopicSummary, TopicTerm, UploadedDataset, YearlyTerm } from './types';

type Filters = Record<string, string | number | undefined>;

export const lyricsApi = {
  overview: async () => (await apiClient.get<Overview>('/analytics/overview')).data,
  filterOptions: async () => (await apiClient.get<FilterOptions>('/analytics/filter-options')).data,
  highlights: async () => (await apiClient.get<HighlightPayload>('/analytics/highlights')).data,
  topics: async (filters?: Filters) => (await apiClient.get<TopicSummary[]>('/analytics/topics', { params: filters })).data,
  topicSongs: async (topicId: number, filters?: Filters) => (await apiClient.get<TopicSong[]>(`/analytics/topics/${topicId}/songs`, { params: filters })).data,
  topicTerms: async (topicId: number) => (await apiClient.get<TopicTerm[]>(`/analytics/topics/${topicId}/terms`)).data,
  topicQuality: async () => (await apiClient.get<TopicQuality[]>('/analytics/topic-quality')).data,
  drilldownSongs: async (filters?: Filters) => (await apiClient.get<Song[]>('/analytics/drilldown/songs', { params: filters })).data,
  sentimentTrends: async (filters?: Filters) => (await apiClient.get<BucketMetric[]>('/analytics/sentiment-trends', { params: filters })).data,
  yearlyTerms: async (filters?: Filters) => (await apiClient.get<YearlyTerm[]>('/analytics/yearly-terms', { params: filters })).data,
  decadeTrends: async (filters?: Filters) => (await apiClient.get<DecadeTrend[]>('/analytics/decade-trends', { params: filters })).data,
  genreSentiment: async (filters?: Filters) => (await apiClient.get<GenreSentiment[]>('/analytics/genre-sentiment', { params: filters })).data,
  topicDecade: async (filters?: Filters) => (await apiClient.get<TopicDecade[]>('/analytics/topic-decade', { params: filters })).data,
  languageCulture: async (filters?: Filters) => (await apiClient.get<LanguageCulture[]>('/analytics/language-culture', { params: filters })).data,
  artistStyleClusters: async (filters?: Filters) => (await apiClient.get<ArtistCluster[]>('/analytics/artist-style-clusters', { params: filters })).data,
  genreLeakage: async (filters?: Filters) => (await apiClient.get<GenreLeakage[]>('/analytics/genre-leakage', { params: filters })).data,
  genres: async () => (await apiClient.get<Array<{ genre: string; song_count: number }>>('/analytics/genres')).data,
  languages: async () => (await apiClient.get<Array<{ language: string; song_count: number }>>('/analytics/languages')).data,
  searchSongs: async (q: string) => (await apiClient.get<Song[]>('/songs/search', { params: { q, limit: 10 } })).data,
  songOptions: async () => (await apiClient.get<SongOption[]>('/songs/options', { params: { limit: 200 } })).data,
  similarSongs: async (songId: string, method = 'tfidf') =>
    (await apiClient.get<SimilarSong[]>(`/songs/${songId}/similar`, { params: { method } })).data,
  similarityExplanations: async (songId: string, method = 'tfidf') =>
    (await apiClient.get<SimilarityExplanation[]>(`/songs/${songId}/similar/explanations`, { params: { method } })).data,
  similarityGraph: async (songId: string, method = 'tfidf') =>
    (await apiClient.get<SimilarityGraph>(`/songs/${songId}/similar/graph`, { params: { method } })).data,
  searchArtists: async (q: string) => (await apiClient.get<Artist[]>('/artists/search', { params: { q } })).data,
  artistStyle: async (artistId: string) => (await apiClient.get<{ artist_id: string; fingerprint: Record<string, number> }>(`/artists/${artistId}/style`)).data,
  evaluation: async () => (await apiClient.get<Record<string, unknown>>('/models/evaluation')).data,
  predictGenre: async (features: Record<string, number>) =>
    (await apiClient.post<{ predicted_genre: string; confidence: number; scores: Record<string, number> }>('/models/genre-classifier/predict', { features })).data,
  explainGenrePrediction: async (features: Record<string, number>) =>
    (await apiClient.post<GenrePredictionExplanation>('/models/genre-classifier/explain', { features })).data,
  safetyPolicy: async () => (await apiClient.get<Record<string, unknown>>('/safety/policy')).data,
  safetyAudit: async () => (await apiClient.get<Record<string, unknown>>('/safety/audit')).data
  ,
  dataQualityReport: async () => (await apiClient.get<DataQualityReport>('/data-quality/report')).data
  ,
  uploadDataset: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return (await apiClient.post<UploadedDataset>('/datasets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })).data;
  },
  datasetProfile: async (datasetId = 'demo') => (await apiClient.get<DatasetProfile>(`/analysis/datasets/${datasetId}/profile`)).data,
  cleaningPreview: async (datasetId = 'demo') => (await apiClient.post<CleaningPreview>(`/analysis/datasets/${datasetId}/cleaning-preview`)).data,
  classificationAnalysis: async (datasetId = 'demo') => (await apiClient.post<ClassificationAnalysis>(`/analysis/datasets/${datasetId}/models/classification`)).data,
  clusteringAnalysis: async (datasetId = 'demo') => (await apiClient.post<ClusteringAnalysis>(`/analysis/datasets/${datasetId}/models/clustering`)).data,
  tfidfSummary: async (datasetId = 'demo') => (await apiClient.post<TfidfSummary>(`/analysis/datasets/${datasetId}/text/tfidf`)).data,
  topicModelSummary: async (datasetId = 'demo') => (await apiClient.post<TopicModelSummary>(`/analysis/datasets/${datasetId}/text/topics`)).data,
  analysisStories: async (datasetId = 'demo', scope: StoryScope = 'overview') => (await apiClient.get<AnalysisStories>(`/analysis/datasets/${datasetId}/stories`, { params: { scope } })).data,
  explainabilityCenter: async (datasetId = 'demo', songId?: string) => (await apiClient.get<ExplainabilityPayload>(`/analysis/datasets/${datasetId}/explainability`, { params: { song_id: songId } })).data,
  lineageReplay: async (datasetId = 'demo', songId?: string) => (await apiClient.get<LineagePayload>(`/analysis/datasets/${datasetId}/lineage`, { params: { song_id: songId } })).data,
  analysisReport: async (datasetId = 'demo', payload: { mode: 'executive' | 'data_scientist'; selected_insight_ids: string[]; selected_chart_ids: string[] }) =>
    (await apiClient.post<ReportPayload>(`/analysis/datasets/${datasetId}/reports`, payload)).data
};
