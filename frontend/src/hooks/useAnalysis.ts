import { useQuery } from '@tanstack/react-query';
import { lyricsApi } from '../api/lyricsApi';
import type { StoryScope } from '../api/types';
import { useDataset } from '../contexts/DatasetContext';

export const useDatasetProfile = () => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'dataset-profile'], queryFn: () => lyricsApi.datasetProfile(datasetId) });
};
export const useCleaningPreview = () => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'cleaning-preview'], queryFn: () => lyricsApi.cleaningPreview(datasetId) });
};
export const useClassificationAnalysis = () => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'classification'], queryFn: () => lyricsApi.classificationAnalysis(datasetId) });
};
export const useClusteringAnalysis = () => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'clustering'], queryFn: () => lyricsApi.clusteringAnalysis(datasetId) });
};
export const useTfidfSummary = () => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'tfidf'], queryFn: () => lyricsApi.tfidfSummary(datasetId) });
};
export const useTopicModelSummary = () => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'topic-model'], queryFn: () => lyricsApi.topicModelSummary(datasetId) });
};
export const useAnalysisStories = (scope: StoryScope = 'overview') => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'stories', scope], queryFn: () => lyricsApi.analysisStories(datasetId, scope) });
};
export const useExplainabilityCenter = (songId?: string) => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'explainability', songId], queryFn: () => lyricsApi.explainabilityCenter(datasetId, songId) });
};
export const useLineageReplay = (songId?: string) => {
  const { datasetId } = useDataset();
  return useQuery({ queryKey: ['analysis', datasetId, 'lineage', songId], queryFn: () => lyricsApi.lineageReplay(datasetId, songId) });
};
export const useAnalysisReport = (mode: 'executive' | 'data_scientist', selectedInsightIds: string[]) => {
  const { datasetId } = useDataset();
  return useQuery({
    queryKey: ['analysis', datasetId, 'report', mode, selectedInsightIds],
    queryFn: () => lyricsApi.analysisReport(datasetId, { mode, selected_insight_ids: selectedInsightIds, selected_chart_ids: [] })
  });
};
