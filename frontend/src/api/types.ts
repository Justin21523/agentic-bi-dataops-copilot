export type Song = {
  song_id: string;
  title: string;
  artist_id: string;
  artist_name?: string;
  album?: string;
  year?: number;
  decade?: number;
  language?: string;
  language_family?: string;
  genre?: string;
  predicted_genre?: string;
  prediction_confidence?: number;
};

export type Artist = {
  artist_id: string;
  artist_name: string;
  country?: string;
  active_start_year?: number;
  active_end_year?: number;
};

export type Overview = {
  total_songs: number;
  total_artists: number;
  topic_count: number;
  genre_count: number;
  language_count: number;
  year_from?: number;
  year_to?: number;
  evaluation: Record<string, unknown>;
};

export type TopicSummary = { topic_id: number; topic_label: string; song_count: number; average_score: number };
export type BucketMetric = { bucket: string | number; sentiment_score: number };
export type SimilarSong = Song & { similar_song_id: string; similarity_score: number; method: string };
export type YearlyTerm = { year: number; term: string; score: number; rank: number };
export type TopicSong = Song & { topic_label: string; topic_score: number };
export type DecadeTrend = { decade: number; term: string; score: number; best_rank: number; observations: number };
export type GenreSentiment = { genre: string; decade: number; song_count: number; sentiment_score: number; positive_count: number; neutral_count: number; negative_count: number };
export type TopicDecade = { topic_id: number; topic_label: string; decade: number; song_count: number; average_score: number };
export type LanguageCulture = { language: string; language_family: string; region: string; decade: number; song_count: number; sentiment_score: number };
export type ArtistCluster = {
  artist_id: string;
  artist_name: string;
  region: string;
  cluster: string;
  topic_diversity: number;
  sentiment_intensity: number;
  genre_consistency: number;
  lyrical_complexity_proxy: number;
  style_uniqueness: number;
};
export type GenreLeakage = { method: string; source_genre: string; similar_genre: string; pair_count: number; similarity_score: number; same_genre_rate: number };
export type FilterOptions = { genres: string[]; languages: string[]; decades: number[]; regions: string[] };
export type TopicTerm = { topic_id: number; topic_label: string; term: string; score: number };
export type HighlightPayload = { rising_terms: DecadeTrend[]; sentiment_contrast: Array<{ genre: string; sentiment_score: number }>; top_culture_segment: LanguageCulture[]; safety_status: string };
export type SimilarityExplanation = SimilarSong & { shared_terms: string[]; shared_topics: Array<{ topic_id: number; topic_label: string }>; genre_match: boolean };
export type TopicQuality = { topic_id: number; topic_label: string; song_count: number; average_score: number; coherence: number; top_terms: Array<{ term: string; score: number }> };
export type DataQualityReport = {
  status: string;
  tables: Record<string, { rows: number; columns: string[] }>;
  issues: Array<Record<string, unknown>>;
  safety: Record<string, unknown>;
  coverage?: { year_from?: number; year_to?: number; genres?: string[]; languages?: string[] };
};

export type WorkflowStepStatus = 'pending' | 'active' | 'complete' | 'warning';
export type DatasetProfile = {
  dataset_id: string;
  name: string;
  row_count: number;
  column_count: number;
  duplicate_rows: number;
  missing_cells: number;
  columns: Array<{ name: string; dtype: string; missing: number; unique: number; sample_values: string[] }>;
  numeric_summary: Record<string, Record<string, number>>;
  categorical_summary: Record<string, Array<{ value: string; count: number }>>;
  workflow: Array<{ step: string; status: WorkflowStepStatus }>;
};
export type UploadedDataset = {
  dataset_id: string;
  status: 'ready' | 'fail';
  validation: Record<string, unknown>;
  processing_timeline?: PipelineStep[];
  suggestions?: string[];
  quality?: DataQualityReport;
  evaluation?: Record<string, unknown>;
};
export type PipelineStep = {
  step: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  duration_ms: number;
  outputs: string[];
  metrics: Record<string, unknown>;
  message: string;
};
export type CleaningPreview = {
  dataset_id: string;
  input_rows: number;
  output_rows: number;
  duplicate_rows_removed: number;
  issues: Array<{ column: string; issue: string; count: number; action: string }>;
  recommended_actions: string[];
};
export type FeatureScore = { feature: string; score: number };
export type ModelResult = {
  model_id: string;
  label: string;
  family: string;
  accuracy: number;
  macro_f1: number;
  confusion_matrix?: { labels: string[]; matrix: number[][] };
  per_class_metrics?: Record<string, { precision: number; recall: number; f1: number; support: number }>;
  top_features: FeatureScore[];
  notes?: string;
  error?: string;
};
export type DecisionTreeNode = {
  id: string;
  raw_id?: number;
  left?: number;
  right?: number;
  feature?: string | null;
  threshold?: number | null;
  samples: number;
  sample_ratio?: number;
  prediction: string;
  depth: number;
  is_leaf: boolean;
  impurity?: number;
  class_counts?: number[];
  class_labels?: string[];
  majority_count?: number;
  x_order?: number;
};
export type DecisionTreeEdge = { id: string; source: string; target: string; label?: string };
export type ClassificationAnalysis = {
  dataset_id: string;
  target: string;
  feature_space: string;
  baseline?: { model_id: string; label: string; accuracy: number };
  leakage_audit?: Record<string, string | number>;
  models: ModelResult[];
  decision_tree: { text: string; nodes: DecisionTreeNode[]; edges: DecisionTreeEdge[]; node_count: number; max_depth: number };
  random_forest?: {
    tree_count: number;
    feature_importances: FeatureScore[];
    sample_trees: Array<{ tree_index: number; nodes: DecisionTreeNode[]; edges: DecisionTreeEdge[]; node_count: number; max_depth: number }>;
  };
  deep_learning: { status: string; methods: string[]; note: string };
};
export type ClusterPoint = { song_id: string; x: number; y: number; cluster: number; label: string };
export type ClusterProfile = {
  cluster: number;
  size: number;
  dominant_label: string;
  centroid: { x: number; y: number };
  label_distribution: Array<{ label: string; count: number }>;
  representative_songs?: Array<{ song_id: string; title?: string; artist_id?: string; year?: number; genre?: string }>;
  top_terms?: Array<{ term: string; score: number }>;
  topic_mix?: Array<{ topic_label: string; count: number }>;
  contrast_terms?: Array<{ term: string; score: number }>;
};
export type ClusteringAnalysis = {
  dataset_id: string;
  feature_space: string;
  projection_note?: string;
  methods: Array<{ method: string; cluster_count: number; noise_count: number; silhouette?: number | null; points: ClusterPoint[]; cluster_profiles?: ClusterProfile[] }>;
};
export type TfidfSummary = { dataset_id: string; method: string; terms: Array<{ term: string; score: number }> };
export type TopicModelSummary = {
  dataset_id: string;
  method: string;
  topics: Array<{ topic_id: number; topic_label: string; top_terms: string[] }>;
  assignments: Array<{ song_id: string; topic_id: number; topic_label: string; topic_score: number }>;
};
export type SongOption = { song_id: string; title: string; artist_name: string; genre: string; year: number };
export type SimilarityGraph = {
  source: Record<string, unknown>;
  nodes: Array<{ id: string; type: string; label: string; artist_name?: string; genre?: string; year?: number; role: string }>;
  edges: Array<{ id: string; source: string; target: string; weight: number; label?: string; genre_match?: boolean; method?: string; hidden?: boolean }>;
  explanations: SimilarityExplanation[];
};
export type GenrePredictionExplanation = {
  mode: string;
  predicted_genre: string;
  confidence: number;
  scores: Record<string, number>;
  top_terms: Array<{ term: string; weight: number }>;
  nearest_examples: Array<{ song_id: string; title: string; artist_id: string; year?: number; genre?: string }>;
  leakage_note: string;
};

export type InsightEvidence = { label: string; metric: string; value: unknown; route: string; anchor: string };
export type AnalysisInsight = {
  id: string;
  story_type: 'genre' | 'similarity' | 'topic' | 'artist' | 'data_quality';
  title: string;
  summary: string;
  severity: 'info' | 'medium' | 'warning' | 'high';
  confidence: string;
  evidence: InsightEvidence[];
  next_action: string;
};
export type StoryScope = 'overview' | 'genre' | 'similarity' | 'topic' | 'artist' | 'data_quality';
export type AnalysisStories = { dataset_id: string; scope: StoryScope; insights: AnalysisInsight[] };

export type ExplainabilityPayload = {
  dataset_id: string;
  mode: string;
  selected_song?: Song | null;
  heldout_options: Song[];
  actual_genre?: string | null;
  feature_comparison: Array<{
    model_id: string;
    label: string;
    accuracy: number;
    macro_f1: number;
    top_features: FeatureScore[];
    signed_terms: { positive: Array<{ term: string; score: number }>; negative: Array<{ term: string; score: number }> };
  }>;
  per_class: Array<{
    label: string;
    metrics: { precision?: number; recall?: number; f1?: number; support?: number };
    top_terms: Array<{ term: string; score: number }>;
    confused_with: Array<{ predicted: string; count: number }>;
  }>;
  model_disagreement: Array<{ model_id: string; label: string; prediction: string; matches_actual: boolean }>;
  error_explanations: Array<{ song: Song; actual: string; predictions: Record<string, string> }>;
  leakage_audit: Record<string, unknown>;
  improvement_advice: string[];
};

export type LineageStep = {
  key: string;
  label: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  field_changes: { kept: string[]; removed: string[] };
  explanation: string;
  status: string;
};
export type LineagePayload = { dataset_id: string; selected_song: Song; song_options: Song[]; steps: LineageStep[] };

export type ReportPayload = {
  dataset_id: string;
  filename: string;
  mode: 'executive' | 'data_scientist';
  markdown: string;
  html: string;
  sections: Array<{ id: string; title: string; summary: string }>;
};
