import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { executeSQL } from '../api/client'

interface FunnelRow { status: string; count: number; value: number }
interface CohortRow { cohort_month: string; order_month: string; active: number; cohort_size: number; retention_pct: number }
interface AovRow { month: string; order_count: number; aov: number }
interface DowRow { day_name: string; day_num: number; orders: number; revenue: number }
interface PaymentRow { method: string; count: number; total: number }

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

function monthOffset(cohort: string, order: string): number {
  const [cy, cm] = cohort.split('-').map(Number)
  const [oy, om] = order.split('-').map(Number)
  return (oy - cy) * 12 + (om - cm)
}

const FUNNEL_COLORS: Record<string, string> = {
  completed: '#10b981', pending: '#3b82f6', cancelled: '#ef4444', returned: '#f59e0b',
}

function FunnelChart({ data }: { data: FunnelRow[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="space-y-2">
      {data.map((row, i) => {
        const pct = (row.count / maxCount) * 100
        const convPct = total > 0 ? ((row.count / total) * 100).toFixed(1) : '0'
        const color = FUNNEL_COLORS[row.status] ?? '#94a3b8'
        return (
          <div key={row.status} className="flex items-center gap-3">
            <div className="w-20 text-xs text-right text-slate-600 capitalize font-medium flex-shrink-0">{row.status}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="relative h-10 bg-slate-100 rounded-lg overflow-hidden flex-1">
                <div
                  className="absolute left-0 top-0 h-full rounded-lg transition-all flex items-center justify-end pr-3"
                  style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
                >
                  <span className="text-white text-xs font-semibold whitespace-nowrap">{row.count.toLocaleString()}</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 w-10 flex-shrink-0">{convPct}%</span>
            </div>
          </div>
        )
      })}
      {data.length >= 2 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-6 text-xs">
          <span className="text-slate-500">Conversion rate (completed/total):
            <span className="font-semibold text-emerald-600 ml-1">
              {total > 0 ? ((data.find(d => d.status === 'completed')?.count ?? 0) / total * 100).toFixed(1) : 0}%
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

function CohortHeatmap({ data }: { data: CohortRow[] }) {
  const cohorts = [...new Set(data.map(d => d.cohort_month))].sort()
  const maxOffset = Math.max(...data.map(d => monthOffset(d.cohort_month, d.order_month)), 0)
  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i)

  const lookup: Record<string, Record<number, number>> = {}
  for (const row of data) {
    const off = monthOffset(row.cohort_month, row.order_month)
    if (!lookup[row.cohort_month]) lookup[row.cohort_month] = {}
    lookup[row.cohort_month][off] = row.retention_pct
  }

  const sizes: Record<string, number> = {}
  for (const row of data) {
    if (!sizes[row.cohort_month]) sizes[row.cohort_month] = row.cohort_size
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium text-slate-500 bg-slate-50 border border-slate-200 whitespace-nowrap">Cohort</th>
            <th className="px-2 py-2 text-center font-medium text-slate-500 bg-slate-50 border border-slate-200 whitespace-nowrap">Size</th>
            {offsets.map(off => (
              <th key={off} className="px-2 py-2 text-center font-medium text-slate-500 bg-slate-50 border border-slate-200 w-12">M{off}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort, cohortIdx) => (
            <tr key={`cohort-${cohortIdx}`}>
              <td className="px-3 py-1.5 font-medium text-slate-700 border border-slate-200 whitespace-nowrap bg-slate-50">{cohort}</td>
              <td className="px-2 py-1.5 text-center text-slate-500 border border-slate-200">{sizes[cohort] ?? 0}</td>
              {offsets.map(off => {
                const pct = off === 0 ? 100 : (lookup[cohort]?.[off] ?? null)
                if (pct === null) return <td key={`${cohortIdx}-${off}`} className="border border-slate-200 w-12" />
                const alpha = pct / 100
                return (
                  <td key={`${cohortIdx}-${off}`}
                    className="px-2 py-1.5 text-center border border-slate-200 w-12 font-medium"
                    style={{ background: `rgba(59, 130, 246, ${alpha * 0.8 + 0.05})`, color: alpha > 0.5 ? '#fff' : '#1e3a5f' }}
                    title={`${cohort} M${off}: ${pct}%`}
                  >
                    {pct}%
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FunnelCohort() {
  const { t } = useLang()
  const [funnel, setFunnel] = useState<FunnelRow[]>([])
  const [cohort, setCohort] = useState<CohortRow[]>([])
  const [aov, setAov] = useState<AovRow[]>([])
  const [dow, setDow] = useState<DowRow[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [fRes, cRes, aRes, dowRes, pmRes] = await Promise.all([
        executeSQL(`SELECT status, COUNT(*) AS count, ROUND(SUM(total_amount), 2) AS value FROM orders GROUP BY status ORDER BY count DESC`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`WITH cohort AS (
          SELECT c.customer_id,
            DATE_TRUNC('month', c.signup_date)::VARCHAR AS cohort_month,
            DATE_TRUNC('month', o.order_date)::VARCHAR AS order_month
          FROM customers c
          JOIN orders o ON c.customer_id = o.customer_id
          WHERE o.status IN ('completed')
        ), cohort_sizes AS (
          SELECT cohort_month, COUNT(DISTINCT customer_id) AS cohort_size
          FROM cohort GROUP BY cohort_month
        ), activity AS (
          SELECT cohort_month, order_month, COUNT(DISTINCT customer_id) AS active
          FROM cohort GROUP BY cohort_month, order_month
        )
        SELECT a.cohort_month, a.order_month, a.active, cs.cohort_size,
          ROUND(100.0 * a.active / cs.cohort_size, 1) AS retention_pct
        FROM activity a JOIN cohort_sizes cs ON a.cohort_month = cs.cohort_month
        ORDER BY a.cohort_month, a.order_month`, 500).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT DATE_TRUNC('month', paid_at)::VARCHAR AS month,
          COUNT(*) AS order_count, ROUND(AVG(amount), 2) AS aov
        FROM payments WHERE status = 'completed' AND paid_at IS NOT NULL
        GROUP BY 1 ORDER BY 1 LIMIT 12`, 12).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT strftime(CAST(order_date AS DATE), '%A') AS day_name,
          EXTRACT(DOW FROM CAST(order_date AS DATE))::INT AS day_num,
          COUNT(*) AS orders,
          ROUND(SUM(total_amount), 2) AS revenue
        FROM orders WHERE status = 'completed'
        GROUP BY day_name, day_num ORDER BY day_num`, 7).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT method, COUNT(*) AS count, ROUND(SUM(amount), 2) AS total
        FROM payments WHERE status = 'completed'
        GROUP BY method ORDER BY total DESC`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      ])

      if (!fRes.error) setFunnel(fRes.rows.map(r => ({ status: String(r[0]), count: Number(r[1]), value: Number(r[2]) })))
      if (!cRes.error) setCohort(cRes.rows.map(r => ({
        cohort_month: String(r[0]).slice(0, 7), order_month: String(r[1]).slice(0, 7),
        active: Number(r[2]), cohort_size: Number(r[3]), retention_pct: Number(r[4]),
      })))
      if (!aRes.error) setAov(aRes.rows.map(r => ({ month: String(r[0]).slice(0, 7), order_count: Number(r[1]), aov: Number(r[2]) })))
      if (!dowRes.error && dowRes.rows.length > 0) {
        setDow(dowRes.rows.map(r => ({
          day_name: String(r[0]), day_num: Number(r[1]),
          orders: Number(r[2]), revenue: Number(r[3]),
        })))
      }
      if (!pmRes.error && pmRes.rows.length > 0) {
        setPaymentMethods(pmRes.rows.map(r => ({
          method: String(r[0]), count: Number(r[1]), total: Number(r[2]),
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('funnel.loading')}</div>

  const totalOrders = funnel.reduce((s, r) => s + r.count, 0)
  const completedOrders = funnel.find(r => r.status === 'completed')?.count ?? 0
  const convRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0'
  const avgAov = aov.length > 0 ? (aov.reduce((s, r) => s + r.aov, 0) / aov.length).toFixed(2) : '0'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('funnel.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('funnel.subtitle')}</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card"><p className="metric-value">{totalOrders.toLocaleString()}</p><p className="metric-label">{t('funnel.kpi.totalOrders')}</p></div>
        <div className="metric-card"><p className="metric-value text-emerald-600">{convRate}%</p><p className="metric-label">{t('funnel.kpi.completionRate')}</p></div>
        <div className="metric-card"><p className="metric-value">${avgAov}</p><p className="metric-label">{t('funnel.kpi.avgAov')}</p></div>
        <div className="metric-card">
          <p className="metric-value">{[...new Set(cohort.map(c => c.cohort_month))].length}</p>
          <p className="metric-label">{t('funnel.kpi.cohortMonths')}</p>
        </div>
      </div>

      {/* Funnel + AOV dual-axis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5" data-journey="funnel-chart">
          <p className="section-title">{t('funnel.orderFunnel')}</p>
          {funnel.length > 0
            ? <FunnelChart data={funnel} />
            : <p className="text-sm text-slate-400 text-center py-10">{t('funnel.noOrderData')}</p>
          }
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="section-title mb-0">{t('funnel.monthlyOrders')}</p>
          </div>
          {aov.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={aov} margin={{ top: 5, right: 40, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={40} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} label={{ value: 'Orders', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#94a3b8' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `$${v}`} label={{ value: 'AOV', angle: 90, position: 'insideRight', fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="order_count" name="Orders" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="aov" name="AOV ($)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">{t('funnel.noPaymentData')}</p>}
        </div>
      </div>

      {/* Cohort Heatmap */}
      <div className="card p-5" data-journey="cohort-heatmap">
        <p className="section-title">{t('funnel.cohort')}</p>
        <p className="text-xs text-slate-400 mb-4">Each row = customers who signed up in that month · columns = months since signup · color intensity = retention %</p>
        {cohort.length > 0
          ? <CohortHeatmap data={cohort} />
          : <p className="text-sm text-slate-400 text-center py-10">{t('funnel.noCohortData')}</p>
        }
      </div>

      {/* Day-of-week sales pattern + Payment method breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title">{t('funnel.dowPattern')}</p>
          {dow.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={dow} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day_name" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v: string) => v.slice(0, 3)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('funnel.noDowData')}</p>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title">{t('funnel.paymentMethod')}</p>
          {paymentMethods.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={paymentMethods} dataKey="total" innerRadius={45} outerRadius={72} paddingAngle={3}>
                    {paymentMethods.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {paymentMethods.map((pm, i) => {
                  const totalRev = paymentMethods.reduce((s, p) => s + p.total, 0)
                  return (
                    <div key={pm.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-700 capitalize">{pm.method}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800 text-xs">${pm.total.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400">{totalRev > 0 ? ((pm.total / totalRev) * 100).toFixed(1) : 0}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('funnel.noPaymentMethodData')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
