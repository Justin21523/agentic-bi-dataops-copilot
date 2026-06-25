import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
  ComposedChart,
} from 'recharts'
import { executeSQL } from '../api/client'
import DataFreshness from '../components/DataFreshness'

interface MonthlyRow { month: string; revenue: number }
interface StateRow { state: string; revenue: number }
interface MethodRow { method: string; total: number; count: number }
interface DowRow { day_name: string; day_num: number; revenue: number; orders: number }

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f43f5e', '#84cc16']

export default function RevenueIntelligence() {
  const { t } = useLang()
  const [monthly, setMonthly] = useState<MonthlyRow[]>([])
  const [byState, setByState] = useState<StateRow[]>([])
  const [byMethod, setByMethod] = useState<MethodRow[]>([])
  const [byDow, setByDow] = useState<DowRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, sRes, pmRes, dowRes] = await Promise.all([
        executeSQL(`SELECT DATE_TRUNC('month', date)::VARCHAR AS month, ROUND(SUM(revenue), 2) AS revenue
        FROM daily_sales GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, 12).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT c.state, ROUND(SUM(p.amount), 2) AS revenue
        FROM customers c
        JOIN orders o ON c.customer_id = o.customer_id
        JOIN payments p ON o.order_id = p.order_id AND p.status = 'completed'
        WHERE c.state IS NOT NULL
        GROUP BY c.state ORDER BY revenue DESC LIMIT 8`, 8).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT method, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
        FROM payments WHERE status = 'completed'
        GROUP BY method ORDER BY total DESC`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT strftime(CAST(order_date AS DATE), '%A') AS day_name,
          EXTRACT(DOW FROM CAST(order_date AS DATE))::INT AS day_num,
          ROUND(SUM(total_amount), 2) AS revenue,
          COUNT(*) AS orders
        FROM orders WHERE status = 'completed'
        GROUP BY day_name, day_num ORDER BY day_num`, 7).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      ])

      if (!mRes.error && mRes.rows.length > 0) {
        setMonthly([...mRes.rows.map(r => ({
          month: String(r[0]).slice(0, 7), revenue: Number(r[1]),
        }))].reverse())
      }
      if (!sRes.error && sRes.rows.length > 0) {
        setByState(sRes.rows.map(r => ({ state: String(r[0]), revenue: Number(r[1]) })))
      }
      if (!pmRes.error && pmRes.rows.length > 0) {
        setByMethod(pmRes.rows.map(r => ({ method: String(r[0]), total: Number(r[1]), count: Number(r[2]) })))
      }
      if (!dowRes.error && dowRes.rows.length > 0) {
        setByDow(dowRes.rows.map(r => ({
          day_name: String(r[0]), day_num: Number(r[1]),
          revenue: Number(r[2]), orders: Number(r[3]),
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('revenue.loading')}</div>

  const totalRevenue = monthly.reduce((s, r) => s + r.revenue, 0)
  const avgMonthly = monthly.length > 0 ? totalRevenue / monthly.length : 0
  const topState = byState[0]?.state ?? '—'
  const topMethod = byMethod[0]?.method ?? '—'
  const totalMethodRev = byMethod.reduce((s, r) => s + r.total, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('revenue.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('revenue.subtitle')}</p>
          <DataFreshness tables={['payments', 'orders']} />
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card">
          <p className="metric-value">${(totalRevenue / 1000).toFixed(0)}k</p>
          <p className="metric-label">{t('revenue.kpi.totalRevenue')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value">${(avgMonthly / 1000).toFixed(0)}k</p>
          <p className="metric-label">{t('revenue.kpi.avgMonthly')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value text-blue-600">{topState}</p>
          <p className="metric-label">{t('revenue.kpi.topState')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value text-emerald-600 capitalize">{topMethod}</p>
          <p className="metric-label">{t('revenue.kpi.topMethod')}</p>
        </div>
      </div>

      {/* Monthly revenue trend */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <p className="section-title mb-0">{t('revenue.monthlyTrend')}</p>
        </div>
        {monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('revenue.noData')}</p>
        )}
      </div>

      {/* Revenue by state + payment method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By state — horizontal bar */}
        <div className="card p-5">
          <p className="section-title">{t('revenue.byState')}</p>
          {byState.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byState} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 11, fill: '#64748b' }} width={30} />
                <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {byState.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('revenue.noData')}</p>
          )}
        </div>

        {/* By payment method — donut + table */}
        <div className="card p-5">
          <p className="section-title">{t('revenue.byMethod')}</p>
          {byMethod.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={byMethod} dataKey="total" innerRadius={45} outerRadius={72} paddingAngle={3}>
                    {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {byMethod.map((pm, i) => (
                  <div key={pm.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-700 capitalize">{pm.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800 text-xs">${pm.total.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">
                        {totalMethodRev > 0 ? ((pm.total / totalMethodRev) * 100).toFixed(1) : 0}% · {pm.count} txns
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('revenue.noData')}</p>
          )}
        </div>
      </div>

      {/* Day-of-week revenue pattern */}
      <div className="card p-5">
        <p className="section-title">{t('revenue.byDow')}</p>
        {byDow.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={byDow} margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day_name" tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: string) => v.slice(0, 3)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#3b82f6" radius={[3, 3, 0, 0]} fillOpacity={0.85} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('revenue.noData')}</p>
        )}
      </div>
    </div>
  )
}
