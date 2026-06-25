import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Database, ArrowRight, CheckCircle, FileText, X } from 'lucide-react'
import { useJourney } from '../context/JourneyContext'
import { useLang } from '../context/LangContext'
import { executeSQL } from '../api/client'

interface PreviewData {
  headers: string[]
  rows: string[][]
  source: 'upload' | 'sample'
  name: string
}

const PIPELINE_STAGE_KEYS = ['schema', 'dq', 'etl', 'analytics', 'insights'] as const
const PIPELINE_STAGE_ICONS = ['📁', '🔍', '🏭', '📊', '💡']
const PIPELINE_STAGE_LABELS = ['Schema', 'DQ', 'ETL', 'Analytics', 'Insights']

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1, 11).map(line =>
    line.split(',').map(v => v.replace(/^"|"$/g, '').trim())
  )
  return { headers, rows }
}

export default function UploadPage() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const { dispatch } = useJourney()
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loadingSample, setLoadingSample] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError(t('upload.csvError'))
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)
      if (headers.length === 0) {
        setError(t('upload.csvEmpty'))
        return
      }
      setPreview({ headers, rows, source: 'upload', name: file.name })
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const useSampleData = async () => {
    setLoadingSample(true)
    setError(null)
    try {
      const res = await executeSQL('SELECT customer_id, name, segment, state, city FROM customers LIMIT 8', 8)
      if (res.error) throw new Error(res.error)
      setPreview({
        headers: res.columns ?? ['customer_id', 'name', 'segment', 'state', 'city'],
        rows: res.rows.map(r => r.map(String)),
        source: 'sample',
        name: lang === 'zh' ? 'Sample Data（1,250 客戶 · 8,432 訂單）' : 'Sample Data (1,250 Customers · 8,432 Orders)',
      })
    } catch (e) {
      setError(t('upload.apiError'))
    } finally {
      setLoadingSample(false)
    }
  }

  const startJourney = () => {
    dispatch({ type: 'START' })
    navigate('/')
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('upload.title')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('upload.subtitle')}</p>
      </div>

      {/* Upload zone */}
      {!preview && (
        <div
          data-journey="upload-zone"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="card"
          style={{
            border: `2px dashed ${dragging ? '#3b82f6' : '#cbd5e1'}`,
            background: dragging ? '#eff6ff' : '#f8fafc',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: dragging ? '#3b82f6' : '#94a3b8' }} />
          <p className="text-sm font-semibold text-slate-600 mb-1">
            {dragging ? t('upload.dropzone.active') : t('upload.dropzone')}
          </p>
          <p className="text-xs text-slate-400">{t('upload.dropzone.hint')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-600">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* OR separator */}
      {!preview && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">{t('upload.or')}</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      )}

      {/* Sample data button */}
      {!preview && (
        <button
          onClick={useSampleData}
          disabled={loadingSample}
          className="btn-secondary w-full justify-center py-3 text-sm"
        >
          {loadingSample ? (
            <><div className="spinner" /> {t('upload.loading')}</>
          ) : (
            <><Database className="w-4 h-4" /> {t('upload.sampleBtn')}</>
          )}
        </button>
      )}

      {/* Preview */}
      {preview && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">
                {preview.source === 'sample' ? (
                  <><Database className="w-3.5 h-3.5 inline mr-1 text-blue-500" />{preview.name}</>
                ) : (
                  <><FileText className="w-3.5 h-3.5 inline mr-1 text-blue-500" />{preview.name}</>
                )}
              </span>
            </div>
            <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview table */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>{preview.headers.map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">{t('upload.previewShowing')} {Math.min(preview.rows.length, 10)} {t('upload.previewRows')}</p>
        </div>
      )}

      {/* Pipeline overview */}
      <div className="card p-5">
        <p className="section-title">{t('upload.pipelineTitle')}</p>
        <div className="flex items-center gap-1 mt-3 overflow-x-auto">
          {PIPELINE_STAGE_KEYS.map((key, i) => (
            <div key={key} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex flex-col items-center gap-1 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 min-w-16 text-center">
                <span className="text-lg">{PIPELINE_STAGE_ICONS[i]}</span>
                <span className="text-xs font-semibold text-slate-700">{PIPELINE_STAGE_LABELS[i]}</span>
                <span className="text-[10px] text-slate-400">{t(`upload.pipeline.${key}`)}</span>
              </div>
              {i < PIPELINE_STAGE_KEYS.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start Journey button */}
      <button
        onClick={startJourney}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {t('upload.startJourney')}
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-center text-xs text-slate-400">
        {t('upload.journeyDesc')}
      </p>
    </div>
  )
}
