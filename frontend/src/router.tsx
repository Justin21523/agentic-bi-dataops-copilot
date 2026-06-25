import { createBrowserRouter } from 'react-router-dom';
import { AnalysisStoriesPage } from './pages/AnalysisStoriesPage';
import { AppShell } from './components/layout/AppShell';
import { ArtistStylePage } from './pages/ArtistStylePage';
import { CulturalTimelinePage } from './pages/CulturalTimelinePage';
import { DataLineagePage } from './pages/DataLineagePage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ExplainabilityCenterPage } from './pages/ExplainabilityCenterPage';
import { DatasetWorkflowPage } from './pages/DatasetWorkflowPage';
import { GenreClassifierPage } from './pages/GenreClassifierPage';
import { LicensingPage } from './pages/LicensingPage';
import { MachineLearningLabPage } from './pages/MachineLearningLabPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { ReportWorkspacePage } from './pages/ReportWorkspacePage';
import { SentimentTrendsPage } from './pages/SentimentTrendsPage';
import { SimilarSongsPage } from './pages/SimilarSongsPage';
import { TopicExplorerPage } from './pages/TopicExplorerPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'stories', element: <AnalysisStoriesPage /> },
      { path: 'workflow', element: <DatasetWorkflowPage /> },
      { path: 'lineage', element: <DataLineagePage /> },
      { path: 'ml-lab', element: <MachineLearningLabPage /> },
      { path: 'explainability', element: <ExplainabilityCenterPage /> },
      { path: 'topics', element: <TopicExplorerPage /> },
      { path: 'sentiment', element: <SentimentTrendsPage /> },
      { path: 'artists', element: <ArtistStylePage /> },
      { path: 'similar', element: <SimilarSongsPage /> },
      { path: 'genre-classifier', element: <GenreClassifierPage /> },
      { path: 'timeline', element: <CulturalTimelinePage /> },
      { path: 'evaluation', element: <EvaluationPage /> },
      { path: 'reports', element: <ReportWorkspacePage /> },
      { path: 'licensing', element: <LicensingPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);
