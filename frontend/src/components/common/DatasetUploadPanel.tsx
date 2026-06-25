import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { lyricsApi } from '../../api/lyricsApi';
import type { PipelineStep } from '../../api/types';
import { useDataset } from '../../contexts/DatasetContext';
import { ProcessingTimeline } from './ProcessingTimeline';

const requiredFiles = ['artists.csv', 'songs.csv', 'lyric_bow_features.csv'];

function uploadErrorPayload(error: unknown): { processing_timeline?: PipelineStep[]; suggestions?: string[] } {
  if (typeof error !== 'object' || error === null || !('response' in error)) return {};
  const response = (error as { response?: { data?: { detail?: { processing_timeline?: PipelineStep[]; suggestions?: string[] } } } }).response;
  return response?.data?.detail ?? {};
}

export function DatasetUploadPanel() {
  const queryClient = useQueryClient();
  const { datasetId, isDemo, setDatasetId, resetDataset } = useDataset();
  const [files, setFiles] = useState<File[]>([]);
  const mutation = useMutation({
    mutationFn: () => lyricsApi.uploadDataset(files),
    onSuccess: async (payload) => {
      if (payload.status === 'ready') {
        setDatasetId(payload.dataset_id);
        await queryClient.invalidateQueries();
      }
    }
  });
  const errorPayload = uploadErrorPayload(mutation.error);
  const selected = new Set(files.map((file) => file.name));
  const ready = requiredFiles.every((name) => selected.has(name));

  return (
    <section className="content-panel upload-panel" data-journey-anchor="upload">
      <div className="chart-heading-row">
        <div>
          <h2>Dataset upload</h2>
          <p>Upload safe derived CSV files, or continue with the sample dataset.</p>
        </div>
        <span className={`badge ${isDemo ? '' : 'success'}`}>{isDemo ? 'sample dataset' : datasetId}</span>
      </div>
      <div className="upload-drop">
        <input
          aria-label="Upload safe CSV bundle"
          type="file"
          accept=".csv"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <div className="upload-requirements">
          {requiredFiles.map((name) => <span className={`badge ${selected.has(name) ? 'success' : 'warning'}`} key={name}>{name}</span>)}
        </div>
      </div>
      <div className="state-chip-row">
        <button type="button" disabled={!ready || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Processing pipeline' : 'Upload and run pipeline'}
        </button>
        {!isDemo && <button className="secondary" type="button" onClick={resetDataset}>Use sample dataset</button>}
      </div>
      {(mutation.isPending || mutation.data?.processing_timeline || errorPayload.processing_timeline) && (
        <ProcessingTimeline steps={mutation.data?.processing_timeline ?? errorPayload.processing_timeline} suggestions={mutation.data?.suggestions ?? errorPayload.suggestions} running={mutation.isPending} />
      )}
      {mutation.data?.status === 'fail' && <p className="form-error">Upload failed validation. Check required files and remove protected lyric columns.</p>}
      {mutation.data?.status === 'ready' && <p className="chart-note">Pipeline ready: validation, feature generation, model training, evaluation, and quality report completed.</p>}
      {mutation.isError && <p className="form-error">{errorPayload.suggestions?.[0] ?? 'Upload failed. Verify the CSV bundle and try again.'}</p>}
    </section>
  );
}
