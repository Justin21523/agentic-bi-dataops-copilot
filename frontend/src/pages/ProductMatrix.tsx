import { useEffect, useState } from 'react'
import { Package, RefreshCw, AlertTriangle } from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  Treemap, BarChart, Bar, Cell,
} from 'recharts'
import { executeSQL } from '../api/client'

const CAT_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f43f5e','#84cc16']

interface Product { product_id: string; name: string; category: string; price: number; stock_quantity: number; units_sold: number; revenue: number; avg_score: number }
interface DiscountRow { name: string; category: string; avg_discount: number; gross_margin: number }
interface ReviewDistRow { stars: number; count: number }
interface TopRevenueRow { name: string; category: string; revenue: number }

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0 }
  const sx = points.reduce((s, p) => s + p.x, 0)
  const sy = points.reduce((s, p) => s + p.y, 0)
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0)
  const sx2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx)
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}

const CustomTreemapContent = ({ x, y, width, height, name, depth, value }: Record<string, unknown>) => {
  const xn = Number(x), yn = Number(y), wn = Number(width), hn = Number(height)
  const dep = Number(depth)
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f43f5e','#84cc16']
  const fill = dep === 1 ? colors[Math.abs(String(name ?? '').charCodeAt(0)) % colors.length] : '#e2e8f0'
  if (wn < 10 || hn < 10) return null
  return (
    <g>
      <rect x={xn} y={yn} width={wn} height={hn} fill={fill} stroke="#fff" strokeWidth={dep === 1 ? 2 : 1} fillOpacity={dep === 1 ? 0.85 : 0.5} />
      {wn > 40 && hn > 18 && (
        <text x={xn + wn / 2} y={yn + hn / 2} textAnchor="middle" dominantBaseline="middle"
          fontSize={dep === 1 ? 11 : 9} fill={dep === 1 ? '#fff' : '#334155'} fontWeight={dep === 1 ? 600 : 400}>
          {String(name ?? '').slice(0, Math.floor(wn / 7))}
        </text>
      )}
      {dep === 1 && wn > 50 && hn > 30 && (
        <text x={xn + wn / 2} y={yn + hn / 2 + 14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.7)">
          ${(Number(value) / 1000).toFixed(0)}k
        </text>
      )}
    </g>
  )
}

export default function ProductMatrix() {
  const { t } = useLang()
  const [products, setProducts] = useState<Product[]>([])
  const [treeData, setTreeData] = useState<{ name: string; children: { name: string; size: number }[] }[]>([])
  const [discountData, setDiscountData] = useState<DiscountRow[]>([])
  const [reviewDist, setReviewDist] = useState<ReviewDistRow[]>([])
  const [topRevenue, setTopRevenue] = useState<TopRevenueRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [prodRes, treeRes, discRes, revDistRes, topRevRes] = await Promise.all([
        executeSQL(`SELECT p.product_id, p.name, p.category, p.price, p.stock_quantity,
          COALESCE(SUM(oi.quantity), 0) AS units_sold,
          ROUND(COALESCE(SUM(oi.line_total), 0), 2) AS revenue,
          ROUND(COALESCE(AVG(r.score), 0), 2) AS avg_score
        FROM products p
        LEFT JOIN order_items oi ON p.product_id = oi.product_id
        LEFT JOIN reviews r ON p.product_id = r.product_id
        GROUP BY p.product_id, p.name, p.category, p.price, p.stock_quantity`, 200).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT p.category, p.subcategory,
          ROUND(SUM(oi.line_total), 2) AS revenue,
          SUM(oi.quantity) AS units_sold
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        GROUP BY p.category, p.subcategory ORDER BY revenue DESC`, 50).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT p.name, p.category,
          ROUND(AVG(oi.discount), 3) AS avg_discount,
          ROUND((p.price - p.cost) / NULLIF(p.price, 0), 3) AS gross_margin
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        GROUP BY p.product_id, p.name, p.category, p.price, p.cost`, 150).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT CAST(score AS INTEGER) AS stars, COUNT(*) AS count
        FROM reviews GROUP BY stars ORDER BY stars`, 5).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT p.name, p.category, ROUND(SUM(oi.line_total), 2) AS revenue
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        GROUP BY p.product_id, p.name, p.category
        ORDER BY revenue DESC LIMIT 10`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      ])

      if (!prodRes.error && prodRes.rows.length > 0) {
        setProducts(prodRes.rows.map(r => ({
          product_id: String(r[0]), name: String(r[1]), category: String(r[2]),
          price: Number(r[3]), stock_quantity: Number(r[4]),
          units_sold: Number(r[5]), revenue: Number(r[6]), avg_score: Number(r[7]),
        })))
      }

      if (!treeRes.error && treeRes.rows.length > 0) {
        const cats: Record<string, { name: string; children: { name: string; size: number }[] }> = {}
        for (const r of treeRes.rows) {
          const cat = String(r[0] ?? ''), sub = String(r[1] ?? 'Other'), rev = Number(r[2])
          if (!cats[cat]) cats[cat] = { name: cat, children: [] }
          cats[cat].children.push({ name: sub, size: rev })
        }
        setTreeData(Object.values(cats))
      }

      if (!discRes.error && discRes.rows.length > 0) {
        setDiscountData(discRes.rows.map(r => ({
          name: String(r[0]), category: String(r[1]),
          avg_discount: Number(r[2]), gross_margin: Number(r[3]),
        })))
      }

      if (!revDistRes.error && revDistRes.rows.length > 0) {
        setReviewDist(revDistRes.rows.map(r => ({ stars: Number(r[0]), count: Number(r[1]) })))
      }

      if (!topRevRes.error && topRevRes.rows.length > 0) {
        setTopRevenue(topRevRes.rows.map(r => ({
          name: String(r[0]), category: String(r[1]), revenue: Number(r[2]),
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('products.loading')}</div>

  const categories = [...new Set(products.map(p => p.category))]
  const byCategory = Object.fromEntries(categories.map(cat => [cat, products.filter(p => p.category === cat)]))

  const medianUnits = [...products].sort((a, b) => a.units_sold - b.units_sold)[Math.floor(products.length / 2)]?.units_sold ?? 0
  const medianScore = [...products].sort((a, b) => a.avg_score - b.avg_score)[Math.floor(products.length / 2)]?.avg_score ?? 2.5

  // Inventory alert: stock < 10 but units_sold > median
  const lowStock = products.filter(p => p.stock_quantity < 10 && p.units_sold > medianUnits)

  const discPoints = discountData.map(d => ({ x: d.avg_discount, y: d.gross_margin, name: d.name, category: d.category }))
  const reg = linearRegression(discPoints.map(d => ({ x: d.x, y: d.y })))
  const trendMin = Math.min(...discPoints.map(d => d.x))
  const trendMax = Math.max(...discPoints.map(d => d.x))
  const trendLine = [
    { x: trendMin, y: reg.slope * trendMin + reg.intercept },
    { x: trendMax, y: reg.slope * trendMax + reg.intercept },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('products.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('products.subtitle')}</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card"><p className="metric-value">{products.length}</p><p className="metric-label">{t('products.kpi.total')}</p></div>
        <div className="metric-card"><p className="metric-value">{products.filter(p => p.units_sold > 0).length}</p><p className="metric-label">{t('products.kpi.active')}</p></div>
        <div className="metric-card">
          <p className={`metric-value ${lowStock.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{lowStock.length}</p>
          <p className="metric-label">{t('products.kpi.lowStock')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value">{products.length > 0 ? (products.reduce((s, p) => s + p.avg_score, 0) / products.length).toFixed(2) : '—'}</p>
          <p className="metric-label">{t('products.kpi.avgRating')}</p>
        </div>
      </div>

      {/* BCG Scatter */}
      <div className="card p-5" data-journey="bcg-matrix">
        <p className="section-title">{t('products.bcg')}</p>
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          {[['🌟 Star', 'High sales + High rating'], ['❓ Question', 'Low sales + High rating'],
            ['🐄 Cash Cow', 'High sales + Low rating'], ['🐕 Dog', 'Low sales + Low rating']
          ].map(([label, desc]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="font-medium text-slate-700">{label}</span>
              <span className="text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
        {products.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="units_sold" name="Units Sold" type="number"
                tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Units Sold', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
              <YAxis dataKey="avg_score" name="Avg Rating" type="number" domain={[0, 5]}
                tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Avg Rating', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
              <ZAxis dataKey="revenue" range={[15, 300]} name="Revenue ($)" />
              <ReferenceLine x={medianUnits} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Median Units', fontSize: 9, fill: '#94a3b8' }} />
              <ReferenceLine y={medianScore} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Median Rating', fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload as Product
                return (
                  <div className="card p-3 text-xs shadow-lg">
                    <p className="font-semibold text-slate-800 max-w-40 truncate">{d.name}</p>
                    <p className="text-slate-500">{d.category}</p>
                    <p>Units sold: <span className="font-medium">{d.units_sold}</span></p>
                    <p>Rating: <span className="font-medium">{d.avg_score}</span></p>
                    <p className="text-blue-700">Revenue: <span className="font-medium">${d.revenue.toLocaleString()}</span></p>
                  </div>
                )
              }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {categories.slice(0, 8).map((cat, i) => (
                <Scatter key={cat} name={cat} data={byCategory[cat]} fill={CAT_COLORS[i % CAT_COLORS.length]} fillOpacity={0.75} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('products.noData')}</p>
        )}
      </div>

      {/* Treemap + Discount/Margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title">{t('products.treemap')}</p>
          {treeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <Treemap data={treeData} dataKey="size" aspectRatio={4 / 3} content={<CustomTreemapContent />}>
                <Tooltip content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="card p-2 text-xs shadow">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-slate-500">${(d.size ?? d.value ?? 0).toLocaleString()} revenue</p>
                    </div>
                  )
                }} />
              </Treemap>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-10">{t('products.noData')}</p>}
        </div>

        <div className="card p-5" data-journey="discount-scatter">
          <p className="section-title">{t('products.discount')}</p>
          <p className="text-xs text-slate-400 mb-3">Trend line shows correlation between discounting and margin</p>
          {discountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" name="Avg Discount" type="number" tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Avg Discount Rate', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
                <YAxis dataKey="y" name="Gross Margin" type="number" tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Gross Margin', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip content={({ payload }) => {
                  if (!payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="card p-2 text-xs shadow">
                      <p className="font-medium max-w-32 truncate">{d.name}</p>
                      <p>Discount: {(d.x * 100).toFixed(1)}%</p>
                      <p>Margin: {(d.y * 100).toFixed(1)}%</p>
                    </div>
                  )
                }} />
                <Scatter data={discPoints} fill="#3b82f6" fillOpacity={0.6} />
                <Scatter data={trendLine} fill="#ef4444" line={{ stroke: '#ef4444', strokeWidth: 2 }} shape={() => null as unknown as React.ReactElement} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('products.noData')}</p>
          )}
        </div>
      </div>

      {/* Review score distribution + Top 10 products by revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title">{t('products.reviewDist')}</p>
          {reviewDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reviewDist.map(d => ({ ...d, label: '★'.repeat(d.stars) }))} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 14, fill: '#f59e0b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'reviews']} labelFormatter={(l: string) => `${l} stars`} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {reviewDist.map((d, i) => {
                    const cols = ['#ef4444','#f97316','#f59e0b','#84cc16','#10b981']
                    return <Cell key={i} fill={cols[d.stars - 1] ?? '#94a3b8'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('products.noReviewData')}</p>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title">{t('products.topByRevenue')}</p>
          {topRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topRevenue} layout="vertical" margin={{ top: 5, right: 60, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} width={110}
                  tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v} />
                <Tooltip formatter={(v: number) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topRevenue.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">{t('products.noData')}</p>
          )}
        </div>
      </div>

      {/* Low stock alert table */}
      {lowStock.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="section-title mb-0">{t('products.inventory')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Units Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {lowStock.slice(0, 8).map(p => (
                  <tr key={p.product_id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.category}</td>
                    <td className="text-right text-red-500 font-semibold">{p.stock_quantity}</td>
                    <td className="text-right">{p.units_sold.toLocaleString()}</td>
                    <td className="text-right">${p.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
