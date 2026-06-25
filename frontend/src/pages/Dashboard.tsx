import { useEffect, useState } from 'react'
import {
  BarChart2, Database, ShieldCheck, Clock, Activity,
  CheckCircle2, XCircle, TrendingUp, Users, Package, ShoppingCart,
} from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts'
import MetricCard from '../components/MetricCard'
import type { HealthResponse, TableSummary, DQReport, QueryHistoryResponse } from '../types/api'
import { getHealth, getTables, getDQReport, getQueryHistory, executeSQL } from '../api/client'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f43f5e','#84cc16']

export default function Dashboard() {
  const { t } = useLang()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [tables, setTables] = useState<TableSummary[]>([])
  const [dq, setDq] = useState<DQReport | null>(null)
  const [history, setHistory] = useState<QueryHistoryResponse | null>(null)
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ category: string; revenue: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getHealth(),
      getTables(),
      getDQReport(),
      getQueryHistory(20),
      executeSQL(`
        SELECT DATE_TRUNC('month', paid_at)::VARCHAR AS month, ROUND(SUM(amount),2) AS revenue
        FROM payments WHERE status = 'completed' AND paid_at IS NOT NULL
        GROUP BY 1 ORDER BY 1 LIMIT 12`, 20).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      executeSQL(`
        SELECT p.category, ROUND(SUM(oi.line_total),2) AS revenue
        FROM order_items oi JOIN products p ON oi.product_id = p.product_id
        JOIN orders o ON oi.order_id = o.order_id WHERE o.status = 'completed'
        GROUP BY p.category ORDER BY revenue DESC LIMIT 8`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
    ])
      .then(([h, t, d, hist, rev, cat]) => {
        setHealth(h)
        setTables(t)
        setDq(d)
        setHistory(hist)
        if (!rev.error && rev.rows) {
          setRevenueData(rev.rows.map((r: (string | number | null)[]) => ({ month: String(r[0] ?? '').slice(0, 7), revenue: Number(r[1]) })))
        }
        if (!cat.error && cat.rows) {
          setCategoryData(cat.rows.map((r: (string | number | null)[]) => ({ category: String(r[0] ?? ''), revenue: Number(r[1]) })))
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('dashboard.loading')}</div>
  if (error) return <div className="p-8 text-red-500">API unreachable: {error}. Run <code className="font-mono bg-red-50 px-1 rounded">make api</code> first.</div>

  const totalRows = dq?.tables.reduce((s, t) => s + t.row_count, 0) ?? 0
  const safeQueries = history?.items.filter(i => i.is_safe).length ?? 0
  const totalQ = history?.total ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('dashboard.title')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('dashboard.subtitle')}</p>
      </div>

      {/* API Status */}
      <div className="card p-3 flex items-center gap-3">
        {health?.status === 'ok'
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <XCircle className="w-5 h-5 text-red-500" />
        }
        <div className="flex-1">
          <span className="text-sm font-medium text-slate-700">{health?.status === 'ok' ? t('dashboard.apiOnline') : t('dashboard.apiOffline')}</span>
          <span className="text-xs text-slate-400 ml-2">v{health?.version}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${health?.db_status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          DuckDB {health?.db_status}
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-journey="kpi-cards">
        <MetricCard label={t('kpi.warehouseRows')} value={totalRows.toLocaleString()} icon={Database} color="blue" sub={`${tables.length} tables`} />
        <MetricCard label={t('kpi.totalQueries')} value={totalQ.toLocaleString()} icon={Clock} color="purple" sub={`${safeQueries} ${t('kpi.queries.sub')}`} />
        <MetricCard label={t('kpi.safetyRate')} value={totalQ > 0 ? `${Math.round(safeQueries/totalQ*100)}%` : '—'} icon={ShieldCheck} color="green" sub={t('kpi.safety.sub')} />
        <MetricCard label={t('kpi.tables')} value={tables.length} icon={BarChart2} color="amber" sub={t('kpi.tables.sub')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue trend */}
        <div className="card p-5" data-journey="revenue-chart">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="section-title mb-0">{t('chart.monthlyRevenue')}</p>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">{t('dashboard.noData')}</p>}
        </div>

        {/* Category breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-emerald-500" />
            <p className="section-title mb-0">{t('chart.revenueByCategory')}</p>
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={95} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">{t('common.noData')}</p>}
        </div>
      </div>

      {/* Table overview + Recent queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Table row counts */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-slate-400" />
            <p className="section-title mb-0">{t('chart.warehouseTables')}</p>
          </div>
          <div className="space-y-2">
            {tables.map((t) => {
              const dqTable = dq?.tables.find(d => d.table_name === t.name)
              const rowCount = dqTable?.row_count ?? t.row_count_approx ?? 0
              const maxCount = Math.max(...(dq?.tables.map(d => d.row_count) ?? [1]))
              const pct = maxCount > 0 ? (rowCount / maxCount) * 100 : 0
              return (
                <div key={t.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 font-mono">{t.name}</span>
                    <span className="text-slate-400">{rowCount.toLocaleString()} rows</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent queries */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-slate-400" />
            <p className="section-title mb-0">{t('chart.recentQueries')}</p>
          </div>
          <div className="space-y-2">
            {(history?.items ?? []).slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${item.is_safe ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 truncate">
                    {item.question ?? item.sql.slice(0, 60)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.row_count?.toLocaleString()} rows ·{' '}
                    {item.execution_time_ms ? `${item.execution_time_ms.toFixed(0)}ms` : '—'}
                  </p>
                </div>
              </div>
            ))}
            {(history?.items ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">{t('dashboard.noQueries')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
