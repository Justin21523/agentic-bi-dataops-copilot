import { RouterProvider } from 'react-router-dom';
import { DatasetProvider } from './contexts/DatasetContext';
import { router } from './router';

export function App() {
  return <DatasetProvider><RouterProvider router={router} /></DatasetProvider>;
}
