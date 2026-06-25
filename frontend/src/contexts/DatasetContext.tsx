import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'lyrics_lab_active_dataset';

type DatasetContextValue = {
  datasetId: string;
  isDemo: boolean;
  setDatasetId: (datasetId: string) => void;
  resetDataset: () => void;
};

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasetId, setDatasetIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'demo');
  const value = useMemo<DatasetContextValue>(() => ({
    datasetId,
    isDemo: datasetId === 'demo',
    setDatasetId: (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setDatasetIdState(next);
    },
    resetDataset: () => {
      localStorage.removeItem(STORAGE_KEY);
      setDatasetIdState('demo');
    }
  }), [datasetId]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const value = useContext(DatasetContext);
  return value ?? {
    datasetId: 'demo',
    isDemo: true,
    setDatasetId: () => undefined,
    resetDataset: () => undefined
  };
}
