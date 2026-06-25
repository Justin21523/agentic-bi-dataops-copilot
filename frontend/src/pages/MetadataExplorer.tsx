import { useEffect, useState } from 'react'
import { Database, Key, Link2, Eye, EyeOff, Tag, Hash } from 'lucide-react'
import { useLang } from '../context/LangContext'
import DataTable from '../components/DataTable'
import { getTables, getTableSchema, executeSQL } from '../api/client'
import type { TableSummary, TableSchemaResponse, ColumnInfo } from '../types/api'

const TAG_COLORS: Record<string, string> = {
  metric:    'bg-emerald-50 text-emerald-700 border-emerald-100',
  id:        'bg-orange-50 text-orange-700 border-orange-100',
  fk:        'bg-blue-50 text-blue-700 border-blue-100',
  date:      'bg-purple-50 text-purple-700 border-purple-100',
  pii:       'bg-red-50 text-red-700 border-red-100',
  category:  'bg-cyan-50 text-cyan-700 border-cyan-100',
  geography: 'bg-teal-50 text-teal-700 border-teal-100',
  status:    'bg-indigo-50 text-indigo-700 border-indigo-100',
  flag:      'bg-pink-50 text-pink-700 border-pink-100',
  dimension: 'bg-amber-50 text-amber-700 border-amber-100',
  audit:     'bg-gray-100 text-gray-600 border-gray-200',
  text:      'bg-slate-100 text-slate-600 border-slate-200',
}

function ColTag({ tag }: { tag: string }) {
  const cls = TAG_COLORS[tag] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`badge-tag ${cls} border`}>{tag}</span>
  )
}

function ColumnRow({ col, isLast }: { col: ColumnInfo; isLast: boolean }) {
  const { t } = useLang()
  const [showSamples, setShowSamples] = useState(false)
  return (
    <div className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-slate-50 ${!isLast ? 'border-b border-slate-100' : ''}`}>
      <div className="col-span-3 font-mono font-medium text-slate-800 flex items-center gap-1.5">
        {col.name}
        {!col.nullable && <span className="text-[9px] font-sans font-semibold text-red-500 uppercase tracking-wide">NOT NULL</span>}
      </div>
      <div className="col-span-2">
        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{col.dtype}</span>
      </div>
      <div className="col-span-4 text-xs text-slate-500 flex items-start gap-1 flex-wrap">
        {col.semantic_tags.map((t) => <ColTag key={t} tag={t} />)}
      </div>
      <div className="col-span-3 text-xs text-slate-400">
        {col.description && <p className="mb-1">{col.description}</p>}
        {col.sample_values.length > 0 && (
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
          >
            {showSamples ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showSamples ? t('schema.hideSamples') : t('schema.samples')}
          </button>
        )}
        {showSamples && (
          <div className="mt-1 flex flex-wrap gap-1">
            {col.sample_values.filter(Boolean).slice(0, 5).map((s, i) => (
              <span key={i} className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                {String(s).slice(0, 20)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MetadataExplorer() {
  const { t } = useLang()
  const [tables, setTables] = useState<TableSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [schema, setSchema] = useState<TableSchemaResponse | null>(null)
  const [preview, setPreview] = useState<{ columns: string[]; rows: (string | number | null)[][] } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [schemaLoading, setSchemaLoading] = useState(false)

  useEffect(() => {
    getTables().then((t) => {
      setTables(t)
      if (t.length > 0) setSelected(t[0].name)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setSchemaLoading(true)
    setPreview(null)
    setShowPreview(false)
    getTableSchema(selected)
      .then(setSchema)
      .finally(() => setSchemaLoading(false))
  }, [selected])

  const loadPreview = async () => {
    if (!selected) return
    const res = await executeSQL(`SELECT * FROM ${selected} LIMIT 5`, 5)
    if (!('error' in res) || !res.error) {
      setPreview({ columns: res.columns, rows: res.rows })
      setShowPreview(true)
    }
  }

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('schema.loading')}</div>

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('schema.title')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('schema.subtitle')} · {tables.length} tables</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Table list */}
        <div className="xl:col-span-1" data-journey="schema-tables">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('schema.tables')}</p>
            </div>
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelected(t.name)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${
                  selected === t.name ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className={`w-3.5 h-3.5 flex-shrink-0 ${selected === t.name ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-mono font-medium ${selected === t.name ? 'text-blue-700' : 'text-slate-700'}`}>
                    {t.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 pl-5">
                  {t.row_count_approx ? `~${t.row_count_approx.toLocaleString()} rows` : '?'} · {t.column_count} cols
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Schema detail */}
        <div className="xl:col-span-4 space-y-4">
          {schemaLoading ? (
            <div className="flex items-center gap-3 text-slate-400 py-8">
              <div className="spinner" /> {t('schema.loadingSchema')}
            </div>
          ) : schema ? (
            <>
              {/* Table header */}
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold font-mono text-slate-800">{schema.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{schema.description}</p>
                  </div>
                  <button
                    onClick={() => { loadPreview(); setShowPreview(true) }}
                    className="btn-secondary text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" /> {t('schema.preview')}
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 mt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-medium">PK:</span>
                    <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{schema.primary_key}</code>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    {schema.columns.length} columns
                  </div>
                  {schema.row_count_approx && (
                    <div className="text-slate-500">~{schema.row_count_approx.toLocaleString()} rows</div>
                  )}
                </div>

                {/* Relationships */}
                {schema.relationships.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('schema.relationships')}</p>
                    <div className="flex flex-wrap gap-2">
                      {schema.relationships.map((rel, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                          <Link2 className="w-3 h-3 text-blue-400" />
                          <code className="font-mono text-blue-700">{rel.column}</code>
                          <span className="text-blue-400">→</span>
                          <code className="font-mono text-blue-700">{rel.references}</code>
                          <span className="text-blue-400 text-[10px]">({rel.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column grid */}
              <div className="card overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="col-span-3">{t('schema.colColumn')}</div>
                  <div className="col-span-2">{t('schema.colType')}</div>
                  <div className="col-span-4">{t('schema.colTags')}</div>
                  <div className="col-span-3">{t('schema.colDescSamples')}</div>
                </div>
                {schema.columns.map((col, i) => (
                  <ColumnRow key={col.name} col={col} isLast={i === schema.columns.length - 1} />
                ))}
              </div>

              {/* Data preview */}
              {showPreview && preview && (
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="section-title">{t('schema.previewTitle')}</p>
                    <button onClick={() => setShowPreview(false)} className="text-xs text-slate-400 hover:text-slate-600">
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                  <DataTable columns={preview.columns} rows={preview.rows} maxHeight={220} />
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
