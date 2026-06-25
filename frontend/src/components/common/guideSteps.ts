export type GuideVisualType = 'overview' | 'upload' | 'pipeline' | 'model' | 'tree' | 'network' | 'evaluation' | 'report';

export type GuideStep = {
  key: string;
  route: string;
  anchor: string;
  titleKey: string;
  bodyKey: string;
  actionKey: string;
  visualType: GuideVisualType;
};

export const guideSteps: GuideStep[] = [
  { key: 'overview-hero', route: '/', anchor: 'overview-hero', titleKey: 'guide.steps.overviewHero.title', bodyKey: 'guide.steps.overviewHero.body', actionKey: 'guide.steps.overviewHero.action', visualType: 'overview' },
  { key: 'overview-stories', route: '/', anchor: 'overview-stories', titleKey: 'guide.steps.overviewStories.title', bodyKey: 'guide.steps.overviewStories.body', actionKey: 'guide.steps.overviewStories.action', visualType: 'overview' },
  { key: 'stories', route: '/stories', anchor: 'story-builder', titleKey: 'guide.steps.stories.title', bodyKey: 'guide.steps.stories.body', actionKey: 'guide.steps.stories.action', visualType: 'overview' },
  { key: 'upload', route: '/workflow', anchor: 'upload', titleKey: 'guide.steps.upload.title', bodyKey: 'guide.steps.upload.body', actionKey: 'guide.steps.upload.action', visualType: 'upload' },
  { key: 'inspect', route: '/workflow', anchor: 'inspect', titleKey: 'guide.steps.inspect.title', bodyKey: 'guide.steps.inspect.body', actionKey: 'guide.steps.inspect.action', visualType: 'pipeline' },
  { key: 'clean', route: '/workflow', anchor: 'clean', titleKey: 'guide.steps.clean.title', bodyKey: 'guide.steps.clean.body', actionKey: 'guide.steps.clean.action', visualType: 'pipeline' },
  { key: 'lineage-start', route: '/lineage', anchor: 'lineage-replay', titleKey: 'guide.steps.lineageStart.title', bodyKey: 'guide.steps.lineageStart.body', actionKey: 'guide.steps.lineageStart.action', visualType: 'pipeline' },
  { key: 'lineage-detail', route: '/lineage', anchor: 'lineage-detail', titleKey: 'guide.steps.lineageDetail.title', bodyKey: 'guide.steps.lineageDetail.body', actionKey: 'guide.steps.lineageDetail.action', visualType: 'pipeline' },
  { key: 'ml-comparison', route: '/ml-lab', anchor: 'classification', titleKey: 'guide.steps.mlComparison.title', bodyKey: 'guide.steps.mlComparison.body', actionKey: 'guide.steps.mlComparison.action', visualType: 'model' },
  { key: 'ml-tradeoff', route: '/ml-lab', anchor: 'model-tradeoff', titleKey: 'guide.steps.mlTradeoff.title', bodyKey: 'guide.steps.mlTradeoff.body', actionKey: 'guide.steps.mlTradeoff.action', visualType: 'model' },
  { key: 'tree', route: '/ml-lab', anchor: 'tree', titleKey: 'guide.steps.tree.title', bodyKey: 'guide.steps.tree.body', actionKey: 'guide.steps.tree.action', visualType: 'tree' },
  { key: 'cluster', route: '/ml-lab', anchor: 'cluster', titleKey: 'guide.steps.cluster.title', bodyKey: 'guide.steps.cluster.body', actionKey: 'guide.steps.cluster.action', visualType: 'network' },
  { key: 'tfidf', route: '/ml-lab', anchor: 'tfidf', titleKey: 'guide.steps.tfidf.title', bodyKey: 'guide.steps.tfidf.body', actionKey: 'guide.steps.tfidf.action', visualType: 'model' },
  { key: 'explainability', route: '/explainability', anchor: 'explainability-center', titleKey: 'guide.steps.explainability.title', bodyKey: 'guide.steps.explainability.body', actionKey: 'guide.steps.explainability.action', visualType: 'model' },
  { key: 'disagreement', route: '/explainability', anchor: 'model-disagreement', titleKey: 'guide.steps.disagreement.title', bodyKey: 'guide.steps.disagreement.body', actionKey: 'guide.steps.disagreement.action', visualType: 'model' },
  { key: 'similarity', route: '/similar', anchor: 'similarity-network', titleKey: 'guide.steps.similarity.title', bodyKey: 'guide.steps.similarity.body', actionKey: 'guide.steps.similarity.action', visualType: 'network' },
  { key: 'similarity-evidence', route: '/similar', anchor: 'similarity-evidence', titleKey: 'guide.steps.similarityEvidence.title', bodyKey: 'guide.steps.similarityEvidence.body', actionKey: 'guide.steps.similarityEvidence.action', visualType: 'network' },
  { key: 'artist-network', route: '/artists', anchor: 'artist-network', titleKey: 'guide.steps.artistNetwork.title', bodyKey: 'guide.steps.artistNetwork.body', actionKey: 'guide.steps.artistNetwork.action', visualType: 'network' },
  { key: 'artist-fingerprint', route: '/artists', anchor: 'artist-fingerprint', titleKey: 'guide.steps.artistFingerprint.title', bodyKey: 'guide.steps.artistFingerprint.body', actionKey: 'guide.steps.artistFingerprint.action', visualType: 'network' },
  { key: 'evaluation-flow', route: '/evaluation', anchor: 'evaluation-flow', titleKey: 'guide.steps.evaluationFlow.title', bodyKey: 'guide.steps.evaluationFlow.body', actionKey: 'guide.steps.evaluationFlow.action', visualType: 'evaluation' },
  { key: 'evaluation-matrix', route: '/evaluation', anchor: 'evaluation', titleKey: 'guide.steps.evaluationMatrix.title', bodyKey: 'guide.steps.evaluationMatrix.body', actionKey: 'guide.steps.evaluationMatrix.action', visualType: 'evaluation' },
  { key: 'error-story', route: '/evaluation', anchor: 'error-story', titleKey: 'guide.steps.errorStory.title', bodyKey: 'guide.steps.errorStory.body', actionKey: 'guide.steps.errorStory.action', visualType: 'evaluation' },
  { key: 'reports', route: '/reports', anchor: 'report-workspace', titleKey: 'guide.steps.reports.title', bodyKey: 'guide.steps.reports.body', actionKey: 'guide.steps.reports.action', visualType: 'report' },
  { key: 'licensing', route: '/licensing', anchor: 'licensing-safety', titleKey: 'guide.steps.licensing.title', bodyKey: 'guide.steps.licensing.body', actionKey: 'guide.steps.licensing.action', visualType: 'report' }
];
