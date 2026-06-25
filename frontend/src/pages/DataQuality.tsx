import { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getDQReport } from '../api/client'
import type { DQReport, DQTableReport, DQColumnReport } from '../types/api'

function NullBar({ pct }: { pct: number }) {
  const color = pct > 50 ? '#ef4444' : pct > 10 ? '#f59e0b' : '#10b981'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

function TablePanel({ table }: { table: DQTableReport }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const nullCols = table.columns.filter((c) => c.null_count > 0)
  const highNullCols = table.columns.filter((c) => c.null_pct > 20)
  const healthScore = Math.round(100 - (nullCols.length / Math.max(table.columns.length, 1)) * 50)

  const chartData = nullCols.map((c) => ({ name: c.column_name, pct: c.null_pct }))

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Health indicator */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            background: healthScore >= 90 ? '#d1fae5' : healthScore >= 70 ? '#fef3c7' : '#fee2e2',
            color: healthScore >= 90 ? '#065f46' : healthScore >= 70 ? '#92400e' : '#991b1b',
          }}
        >
          {healthScore}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-slate-800">{table.table_name}</span>
            {highNullCols.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {highNullCols.length} {t('dq.colsNullWarning')}
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-1 text-xs text-slate-400">
            <span>{table.row_count.toLocaleString()} rows</span>
            <span>{table.columns.length} columns</span>
            <span>{nullCols.length} with nulls</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 mr-2">{t('dq.healthScore')}</div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
               : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
          {/* Null rate chart */}
          {chartData.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">{t('dq.nullRateByColumn')}</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 20, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={32} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Null rate']} />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.pct > 50 ? '#ef4444' : entry.pct > 10 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle2 className="w-4 h-4" /> {t('dq.noNulls')}
            </div>
          )}

          {/* Column detail table */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">{t('dq.columnDetail')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    {[t('dq.colColumn'), t('dq.colType'), t('dq.colNullPct'), t('dq.colDistinct'), t('dq.colMin'), t('dq.colMax')].map((h) => (
                      <th key={h} className="text-left py-1.5 px-2 font-medium text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((col) => (
                    <tr key={col.column_name} className="border-b border-slate-100 hover:bg-white">
                      <td className="py-1.5 px-2 font-mono font-medium text-slate-700">{col.column_name}</td>
                      <td className="py-1.5 px-2 text-slate-400">{col.dtype}</td>
                      <td className="py-1.5 px-2 w-32">
                        <NullBar pct={col.null_pct} />
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{col.distinct_count.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-slate-400 max-w-24 truncate">{col.min_val ?? '—'}</td>
                      <td className="py-1.5 px-2 text-slate-400 max-w-24 truncate">{col.max_val ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DataQuality() {
  const { t } = useLang()
  const [report, setReport] = useState<DQReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setReport(await getDQReport()) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('dq.loading')}</div>
  if (!report) return null

  const totalRows = report.tables.reduce((s, t) => s + t.row_count, 0)
  const tablesWithNulls = report.tables.filter((t) => t.columns.some((c) => c.null_count > 0)).length
  const avgHealth = Math.round(
    report.tables.reduce((s, t) => {
      const nullCols = t.columns.filter((c) => c.null_count > 0).length
      return s + (100 - (nullCols / Math.max(t.columns.length, 1)) * 50)
    }, 0) / Math.max(report.tables.length, 1)
  )

  return (
    <div className="space-y-5" data-journey="dq-report">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('dq.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('dq.generatedAt')} {report.generated_at?.slice(0, 19)}</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> {t('common.refresh')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="metric-value">{avgHealth}</p>
          <p className="metric-label">{t('dq.avgHealth')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value">{totalRows.toLocaleString()}</p>
          <p className="metric-label">{t('dq.totalRows')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value">{report.tables.length}</p>
          <p className="metric-label">{t('dq.tables')}</p>
        </div>
        <div className="metric-card">
          <p className={`metric-value ${tablesWithNulls > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {tablesWithNulls}
          </p>
          <p className="metric-label">{t('dq.tablesWithNulls')}</p>
        </div>
      </div>

      {/* Overall health overview */}
      <div className="card p-4">
        <p className="section-title">{t('dq.tableHealthOverview')}</p>
        <div className="space-y-2">
          {report.tables.map((tbl) => {
            const nullColCount = tbl.columns.filter((c) => c.null_count > 0).length
            const score = Math.round(100 - (nullColCount / Math.max(tbl.columns.length, 1)) * 50)
            const color = score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'
            return (
              <div key={tbl.table_name} className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-600 w-28 flex-shrink-0">{tbl.table_name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                </div>
                <span className="text-xs font-mono text-slate-500 w-8 text-right">{score}</span>
                {nullColCount > 0
                  ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-table panels */}
      <div className="space-y-3">
        {report.tables.map((t) => <TablePanel key={t.table_name} table={t} />)}
      </div>
    </div>
  )
}
