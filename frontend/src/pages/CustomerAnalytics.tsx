import { useEffect, useState } from 'react'
import { Users, MapPin, TrendingUp, RefreshCw } from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, Treemap, LineChart, Line,
} from 'recharts'
import { executeSQL } from '../api/client'
import DataFreshness from '../components/DataFreshness'

const SEG_COLORS: Record<string, string> = {
  B2C: '#3b82f6', B2B: '#10b981', SMB: '#f59e0b',
}
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

interface RFMPoint { customer_id: string; name: string; segment: string; recency_days: number; frequency: number; monetary: number }
interface SegRow { segment: string; customers: number; revenue: number }
interface GeoRow { state: string; city: string; customer_count: number }
interface AcqRow { month: string; new_customers: number }
interface TopCustomer { name: string; segment: string; city: string; orders: number; total_spent: number }

function bucketLTV(data: RFMPoint[], size = 100) {
  const counts: Record<number, number> = {}
  for (const d of data) {
    const b = Math.floor(d.monetary / size) * size
    counts[b] = (counts[b] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(0, 20)
    .map(([b, c]) => ({ bucket: `$${b}`, count: c }))
}

function buildTreemap(rows: GeoRow[]) {
  return rows.slice(0, 40).map(r => ({
    name: `${r.city}, ${r.state}`,
    size: r.customer_count,
  }))
}

const CustomTreemapContent = ({ x, y, width, height, name, depth, root }: Record<string, unknown>) => {
  const xn = Number(x), yn = Number(y), wn = Number(width), hn = Number(height)
  const dep = Number(depth)
  if (wn < 20 || hn < 20) return null
  return (
    <g>
      <rect x={xn} y={yn} width={wn} height={hn}
        fill={dep === 1 ? '#3b82f6' : '#93c5fd'}
        stroke="#fff" strokeWidth={dep === 1 ? 2 : 1}
        fillOpacity={dep === 1 ? 0.9 : 0.6}
      />
      {wn > 40 && hn > 20 && (
        <text x={xn + wn / 2} y={yn + hn / 2} textAnchor="middle" dominantBaseline="middle"
          fontSize={dep === 1 ? 11 : 9} fill={dep === 1 ? '#fff' : '#1e3a5f'} fontWeight={dep === 1 ? 600 : 400}>
          {String(name).slice(0, Math.floor(wn / 7))}
        </text>
      )}
    </g>
  )
}

export default function CustomerAnalytics() {
  const { t } = useLang()
  const [rfm, setRfm] = useState<RFMPoint[]>([])
  const [seg, setSeg] = useState<SegRow[]>([])
  const [geo, setGeo] = useState<GeoRow[]>([])
  const [acquisition, setAcquisition] = useState<AcqRow[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [rfmRes, segRes, geoRes, acqRes, topRes] = await Promise.all([
        executeSQL(`SELECT c.customer_id, c.name, c.segment,
          DATEDIFF('day', MAX(o.order_date), CURRENT_DATE) AS recency_days,
          COUNT(DISTINCT o.order_id) AS frequency,
          ROUND(COALESCE(SUM(p.amount), 0), 2) AS monetary
        FROM customers c
        LEFT JOIN orders o ON c.customer_id = o.customer_id
        LEFT JOIN payments p ON o.order_id = p.order_id AND p.status = 'completed'
        GROUP BY c.customer_id, c.name, c.segment`, 400).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT c.segment, COUNT(DISTINCT c.customer_id) AS customers,
          ROUND(SUM(p.amount), 2) AS revenue
        FROM customers c
        JOIN orders o ON c.customer_id = o.customer_id
        JOIN payments p ON o.order_id = p.order_id AND p.status = 'completed'
        GROUP BY c.segment ORDER BY revenue DESC`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT state, city, COUNT(DISTINCT customer_id) AS customer_count
        FROM customers WHERE state IS NOT NULL
        GROUP BY state, city ORDER BY state, customer_count DESC`, 200).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT DATE_TRUNC('month', signup_date)::VARCHAR AS month, COUNT(*) AS new_customers
        FROM customers WHERE signup_date IS NOT NULL
        GROUP BY 1 ORDER BY 1`, 24).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT c.name, c.segment, c.city,
          COUNT(DISTINCT o.order_id) AS orders,
          ROUND(SUM(p.amount), 2) AS total_spent
        FROM customers c
        JOIN orders o ON c.customer_id = o.customer_id
        JOIN payments p ON o.order_id = p.order_id AND p.status = 'completed'
        GROUP BY c.customer_id, c.name, c.segment, c.city
        ORDER BY total_spent DESC LIMIT 10`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      ])

      if (!rfmRes.error && rfmRes.rows.length > 0) {
        setRfm(rfmRes.rows.map(r => ({
          customer_id: String(r[0]), name: String(r[1]), segment: String(r[2]),
          recency_days: Number(r[3]) || 0,
          frequency: Number(r[4]) || 0,
          monetary: Number(r[5]) || 0,
        })))
      }
      if (!segRes.error && segRes.rows.length > 0) {
        setSeg(segRes.rows.map(r => ({ segment: String(r[0]), customers: Number(r[1]), revenue: Number(r[2]) })))
      }
      if (!geoRes.error && geoRes.rows.length > 0) {
        setGeo(geoRes.rows.map(r => ({ state: String(r[0] ?? ''), city: String(r[1] ?? ''), customer_count: Number(r[2]) })))
      }
      if (!acqRes.error && acqRes.rows.length > 0) {
        setAcquisition(acqRes.rows.map(r => ({ month: String(r[0]).slice(0, 7), new_customers: Number(r[1]) })))
      }
      if (!topRes.error && topRes.rows.length > 0) {
        setTopCustomers(topRes.rows.map(r => ({
          name: String(r[0]), segment: String(r[1]), city: String(r[2] ?? ''),
          orders: Number(r[3]) || 0, total_spent: Number(r[4]) || 0,
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('customers.loading')}</div>

  const totalRevenue = seg.reduce((s, r) => s + r.revenue, 0)
  const ltv = bucketLTV(rfm, 100)
  const treemapData = buildTreemap(geo)
  const bySegment = Object.entries(
    rfm.reduce<Record<string, RFMPoint[]>>((acc, r) => {
      if (!acc[r.segment]) acc[r.segment] = []
      acc[r.segment].push(r)
      return acc
    }, {})
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('customers.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('customers.subtitle')}</p>
          <DataFreshness tables={['customers', 'orders', 'payments']} />
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card"><p className="metric-value">{rfm.length.toLocaleString()}</p><p className="metric-label">{t('customers.kpi.total')}</p></div>
        <div className="metric-card"><p className="metric-value">${(totalRevenue / 1000).toFixed(0)}k</p><p className="metric-label">{t('customers.kpi.revenue')}</p></div>
        <div className="metric-card"><p className="metric-value">${rfm.length > 0 ? (totalRevenue / rfm.length).toFixed(0) : 0}</p><p className="metric-label">{t('customers.kpi.avgLTV')}</p></div>
        <div className="metric-card"><p className="metric-value">{rfm.length > 0 ? Math.round(rfm.reduce((s, r) => s + r.frequency, 0) / rfm.length * 10) / 10 : 0}</p><p className="metric-label">{t('customers.kpi.avgOrders')}</p></div>
      </div>

      {/* RFM Bubble chart */}
      <div className="card p-5" data-journey="rfm-scatter">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <p className="section-title mb-0">{t('customers.rfm')}</p>
        </div>
        <p className="text-xs text-slate-400 mb-4">Lower recency = more recent · higher frequency = more loyal · larger bubble = higher spend</p>
        {rfm.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="recency_days" name="Recency (days)" type="number"
                tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Days Since Last Order', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="frequency" name="Frequency" type="number"
                tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Order Count', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
              <ZAxis dataKey="monetary" range={[20, 400]} name="Monetary ($)" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0].payload as RFMPoint
                  return (
                    <div className="card p-3 text-xs shadow-lg">
                      <p className="font-semibold text-slate-800">{d.name}</p>
                      <p className="text-slate-500">Segment: {d.segment}</p>
                      <p className="text-slate-500">Recency: {d.recency_days} days</p>
                      <p className="text-slate-500">Frequency: {d.frequency} orders</p>
                      <p className="font-medium text-blue-700">Monetary: ${d.monetary.toLocaleString()}</p>
                    </div>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {bySegment.map(([seg, points]) => (
                <Scatter key={seg} name={seg} data={points} fill={SEG_COLORS[seg] ?? '#94a3b8'} fillOpacity={0.7} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('common.noData')}</p>
        )}
      </div>

      {/* Segment Donut + LTV histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="card p-5" data-journey="segment-donut">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="section-title mb-0">{t('customers.segments')}</p>
          </div>
          {seg.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={seg} dataKey="revenue" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {seg.map((entry, i) => (
                      <Cell key={i} fill={SEG_COLORS[entry.segment] ?? COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {seg.map((s, i) => (
                  <div key={s.segment} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: SEG_COLORS[s.segment] ?? COLORS[i] }} />
                      <span className="font-medium text-slate-700">{s.segment}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">${s.revenue.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{totalRevenue > 0 ? ((s.revenue / totalRevenue) * 100).toFixed(1) : 0}% · {s.customers} cust</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('common.noData')}</p>
          )}
        </div>

        {/* LTV Histogram */}
        <div className="card p-5" data-journey="ltv-histogram">
          <p className="section-title">{t('customers.ltv')}</p>
          {ltv.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ltv} margin={{ top: 5, right: 10, bottom: 25, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'customers']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('common.noData')}</p>
          )}
        </div>
      </div>

      {/* Geographic Treemap */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-slate-400" />
          <p className="section-title mb-0">{t('customers.geo')}</p>
        </div>
        {treemapData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              content={<CustomTreemapContent />}
            >
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="card p-2 text-xs shadow">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-slate-500">{d.size ?? d.value} customers</p>
                  </div>
                )
              }} />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('customers.noGeoData')}</p>
        )}
      </div>

      {/* Monthly new customer acquisition */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <p className="section-title mb-0">{t('customers.acquisition')}</p>
        </div>
        {acquisition.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={acquisition} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'new customers']} />
              <Line type="monotone" dataKey="new_customers" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="New Customers" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('customers.noAcquisition')}</p>
        )}
      </div>

      {/* Top 10 customers by LTV */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-500" />
          <p className="section-title mb-0">{t('customers.topByLTV')}</p>
        </div>
        {topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('customers.col.rank')}</th>
                  <th>{t('customers.col.name')}</th>
                  <th>{t('customers.col.segment')}</th>
                  <th>{t('customers.col.city')}</th>
                  <th>{t('customers.col.orders')}</th>
                  <th>{t('customers.col.spent')}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td className="text-slate-400 font-mono text-xs">{i + 1}</td>
                    <td className="font-medium">{c.name}</td>
                    <td><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{c.segment}</span></td>
                    <td className="text-slate-500">{c.city}</td>
                    <td className="text-right">{c.orders}</td>
                    <td className="text-right font-semibold text-emerald-700">${c.total_spent.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">{t('common.noData')}</p>
        )}
      </div>
    </div>
  )
}
