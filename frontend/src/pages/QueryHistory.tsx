import { useEffect, useState } from 'react'
import { Clock, RefreshCw, ShieldCheck, ShieldAlert, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SqlBlock from '../components/SqlBlock'
import { getQueryHistory } from '../api/client'
import type { QueryHistoryItem } from '../types/api'

export default function QueryHistory() {
  const { t } = useLang()
  const [items, setItems] = useState<QueryHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(50)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getQueryHistory(limit)
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [limit])

  const filtered = items.filter((i) => {
    const q = search.toLowerCase()
    return (
      !q ||
      (i.question ?? '').toLowerCase().includes(q) ||
      i.sql.toLowerCase().includes(q)
    )
  })

  const safeCount = items.filter((i) => i.is_safe).length
  const avgMs = items.reduce((s, i) => s + (i.execution_time_ms ?? 0), 0) / (items.length || 1)

  // Group by date for frequency chart
  const byDate = Object.entries(
    items.reduce<Record<string, number>>((acc, i) => {
      const d = i.timestamp?.slice(0, 10) ?? 'unknown'
      acc[d] = (acc[d] ?? 0) + 1
      return acc
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date: date.slice(5), count }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('history.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('history.subtitle.prefix')}{total.toLocaleString()}{t('history.subtitle.prefix') ? ' ' : ''}{t('history.subtitle.suffix')}</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('common.refresh')}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card">
          <p className="metric-value">{total.toLocaleString()}</p>
          <p className="metric-label">{t('history.totalQueries')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value text-emerald-600">{safeCount.toLocaleString()}</p>
          <p className="metric-label">{t('history.safeExecutions')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value text-red-500">{(items.length - safeCount).toLocaleString()}</p>
          <p className="metric-label">{t('history.blocked')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value">{avgMs > 0 ? `${avgMs.toFixed(0)}ms` : '—'}</p>
          <p className="metric-label">{t('history.avgExecTime')}</p>
        </div>
      </div>

      {/* Frequency chart */}
      {byDate.length > 0 && (
        <div className="card p-5">
          <p className="section-title">{t('history.freqChart')}</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={byDate} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'queries']} />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter + table */}
      <div className="card p-4" data-journey="history-list">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="input pl-9"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="input w-28"
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{t('history.last')} {n}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-slate-400 justify-center">
            <div className="spinner" /> {t('history.loading')}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((item) => (
              <div key={item.id} className="border border-slate-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  {item.is_safe
                    ? <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {item.question ?? item.sql.trim().slice(0, 80)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      #{item.id} · {item.timestamp?.slice(0, 19)} ·{' '}
                      {item.row_count?.toLocaleString() ?? 0} rows ·{' '}
                      {item.execution_time_ms ? `${item.execution_time_ms.toFixed(0)}ms` : '—'}
                    </p>
                  </div>
                  {expanded === item.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  }
                </button>
                {expanded === item.id && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-100 space-y-3">
                    {item.question && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 font-medium">Question</p>
                        <p className="text-sm text-slate-700">{item.question}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-medium">SQL</p>
                      <SqlBlock sql={item.sql} />
                    </div>
                    {item.error_message && (
                      <div className="p-3 bg-red-50 rounded-lg text-xs text-red-600">
                        {item.error_message}
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span className={item.is_safe ? 'text-emerald-600' : 'text-red-600'}>
                        {item.is_safe ? t('history.safe') : t('history.notSafe')}
                      </span>
                      <span>{item.row_count?.toLocaleString() ?? 0} rows</span>
                      {item.execution_time_ms && <span>{item.execution_time_ms.toFixed(1)}ms</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-8 text-sm text-slate-400">
                {search ? t('history.emptySearch') : t('history.emptyAll')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
