import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Users, Star, Calendar,
  ShieldCheck, AlertTriangle, RefreshCw, ExternalLink, Minus,
} from 'lucide-react'
import { useLang } from '../context/LangContext'
import { useNavigate } from 'react-router-dom'
import { executeSQL } from '../api/client'

interface Insight {
  id: string
  title: string
  value: string
  sub: string
  trend: 'up' | 'down' | 'neutral' | 'warn'
  icon: React.ReactNode
  sql: string
  detail?: { label: string; value: string }[]
}

const QUERIES = {
  categoryGrowth: `WITH monthly AS (
    SELECT DATE_TRUNC('month', paid_at)::VARCHAR AS month,
      p.category,
      ROUND(SUM(pay.amount), 2) AS revenue
    FROM payments pay
    JOIN orders o ON pay.order_id = o.order_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    WHERE pay.status = 'completed' AND pay.paid_at IS NOT NULL
    GROUP BY 1, 2
  ),
  ranked AS (
    SELECT category, month, revenue,
      LAG(revenue) OVER (PARTITION BY category ORDER BY month) AS prev_revenue
    FROM monthly
  ),
  latest AS (
    SELECT category, revenue, prev_revenue,
      ROUND(100.0 * (revenue - prev_revenue) / NULLIF(prev_revenue, 0), 1) AS growth_pct,
      ROW_NUMBER() OVER (PARTITION BY category ORDER BY month DESC) AS rn
    FROM ranked WHERE prev_revenue IS NOT NULL
  )
  SELECT category, revenue, prev_revenue, growth_pct
  FROM latest WHERE rn = 1 ORDER BY growth_pct DESC LIMIT 1`,

  topCustomers: `SELECT c.name, c.segment,
    ROUND(SUM(p.amount), 2) AS total_spent,
    COUNT(DISTINCT o.order_id) AS order_count
  FROM customers c
  JOIN orders o ON c.customer_id = o.customer_id
  JOIN payments p ON o.order_id = p.order_id
  WHERE p.status = 'completed'
  GROUP BY c.customer_id, c.name, c.segment
  ORDER BY total_spent DESC LIMIT 5`,

  bestProduct: `SELECT p.name, p.category,
    ROUND(AVG(r.score), 2) AS avg_rating,
    COUNT(r.review_id) AS review_count,
    ROUND(SUM(oi.line_total), 2) AS revenue
  FROM products p
  JOIN reviews r ON p.product_id = r.product_id
  JOIN order_items oi ON p.product_id = oi.product_id
  GROUP BY p.product_id, p.name, p.category
  HAVING AVG(r.score) >= 4.0 AND COUNT(r.review_id) >= 3
  ORDER BY revenue DESC LIMIT 1`,

  busiestDay: `SELECT
    CAST(order_date AS DATE)::VARCHAR AS day,
    COUNT(*) AS orders,
    ROUND(SUM(total_amount), 2) AS revenue
  FROM orders WHERE status = 'completed'
  GROUP BY CAST(order_date AS DATE)
  ORDER BY orders DESC LIMIT 1`,

  safetyRate: `SELECT
    DATE_TRUNC('month', timestamp)::VARCHAR AS month,
    COUNT(*) AS total,
    SUM(CASE WHEN is_safe THEN 1 ELSE 0 END) AS safe
  FROM query_history
  WHERE timestamp IS NOT NULL
  GROUP BY 1 ORDER BY 1 DESC LIMIT 2`,

  lowStock: `SELECT p.name, p.category, p.stock_quantity,
    COALESCE(SUM(oi.quantity), 0) AS units_sold_30d
  FROM products p
  LEFT JOIN order_items oi ON p.product_id = oi.product_id
  LEFT JOIN orders o ON oi.order_id = o.order_id
    AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
  WHERE p.stock_quantity < 50 AND p.is_active = true
  GROUP BY p.product_id, p.name, p.category, p.stock_quantity
  HAVING COALESCE(SUM(oi.quantity), 0) > 0
  ORDER BY p.stock_quantity ASC LIMIT 5`,
}

function TrendIcon({ trend }: { trend: Insight['trend'] }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
  if (trend === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-500" />
  return <Minus className="w-4 h-4 text-slate-400" />
}

const TREND_BG = { up: 'bg-emerald-50 border-emerald-200', down: 'bg-red-50 border-red-200', warn: 'bg-amber-50 border-amber-200', neutral: 'bg-white border-slate-200' }
const TREND_VALUE = { up: 'text-emerald-700', down: 'text-red-700', warn: 'text-amber-700', neutral: 'text-slate-800' }

export default function InsightCards() {
  const { t } = useLang()
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const [cgRes, tcRes, bpRes, bdRes, srRes, lsRes] = await Promise.all([
        executeSQL(QUERIES.categoryGrowth, 1).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(QUERIES.topCustomers, 5).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(QUERIES.bestProduct, 1).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(QUERIES.busiestDay, 1).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(QUERIES.safetyRate, 2).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(QUERIES.lowStock, 5).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      ])

      const cards: Insight[] = []

      // 1. Category growth
      if (!cgRes.error && cgRes.rows.length > 0) {
        const [cat, rev, prev, growth] = cgRes.rows[0]
        const g = Number(growth)
        cards.push({
          id: 'growth',
          title: t('insight.growthTitle'),
          value: String(cat),
          sub: `${g > 0 ? '+' : ''}${g}% MoM · $${Number(prev).toLocaleString()} → $${Number(rev).toLocaleString()}`,
          trend: g >= 0 ? 'up' : 'down',
          icon: <TrendingUp className="w-5 h-5" />,
          sql: QUERIES.categoryGrowth,
        })
      }

      // 2. Top customers
      if (!tcRes.error && tcRes.rows.length > 0) {
        const top = tcRes.rows[0]
        cards.push({
          id: 'ltv',
          title: t('insight.ltvTitle'),
          value: String(top[0]),
          sub: `${top[1]} · ${top[3]} orders`,
          trend: 'neutral',
          icon: <Users className="w-5 h-5" />,
          sql: QUERIES.topCustomers,
          detail: tcRes.rows.slice(0, 5).map(r => ({ label: String(r[0]), value: `$${Number(r[2]).toLocaleString()}` })),
        })
      }

      // 3. Best product
      if (!bpRes.error && bpRes.rows.length > 0) {
        const [name, , rating, reviews, rev] = bpRes.rows[0]
        cards.push({
          id: 'product',
          title: t('insight.productTitle'),
          value: String(name),
          sub: `★ ${Number(rating).toFixed(2)} from ${reviews} reviews · $${Number(rev).toLocaleString()} revenue`,
          trend: 'up',
          icon: <Star className="w-5 h-5" />,
          sql: QUERIES.bestProduct,
        })
      }

      // 4. Busiest day
      if (!bdRes.error && bdRes.rows.length > 0) {
        const [day, orders, rev] = bdRes.rows[0]
        cards.push({
          id: 'busiest',
          title: t('insight.busiestTitle'),
          value: String(day),
          sub: `${orders} completed orders · $${Number(rev).toLocaleString()} revenue`,
          trend: 'neutral',
          icon: <Calendar className="w-5 h-5" />,
          sql: QUERIES.busiestDay,
        })
      }

      // 5. Safety rate
      if (!srRes.error && srRes.rows.length >= 1) {
        const thisMonth = srRes.rows[0]
        const prevMonth = srRes.rows[1]
        const thisRate = Number(thisMonth[2]) / Math.max(Number(thisMonth[1]), 1) * 100
        const prevRate = prevMonth ? Number(prevMonth[2]) / Math.max(Number(prevMonth[1]), 1) * 100 : thisRate
        const diff = (thisRate - prevRate).toFixed(1)
        cards.push({
          id: 'safety',
          title: t('insight.safetyTitle'),
          value: `${thisRate.toFixed(1)}%`,
          sub: `${Number(diff) >= 0 ? '+' : ''}${diff}% vs last month · ${thisMonth[1]} total queries`,
          trend: thisRate >= 90 ? 'up' : thisRate >= 70 ? 'neutral' : 'warn',
          icon: <ShieldCheck className="w-5 h-5" />,
          sql: QUERIES.safetyRate,
        })
      }

      // 6. Low stock warning
      if (!lsRes.error && lsRes.rows.length > 0) {
        cards.push({
          id: 'stock',
          title: t('insight.stockTitle'),
          value: `${lsRes.rows.length} product${lsRes.rows.length > 1 ? 's' : ''}`,
          sub: t('insight.stockSub'),
          trend: 'warn',
          icon: <AlertTriangle className="w-5 h-5" />,
          sql: QUERIES.lowStock,
          detail: lsRes.rows.map(r => ({ label: String(r[0]), value: `${r[2]} left` })),
        })
      }

      setInsights(cards)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openPlayground = (sql: string) => {
    navigate('/playground', { state: { sql } })
  }

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('insights.loading')}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('insights.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('insights.subtitle')}</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('insights.refresh')}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-journey="insight-grid">
        {insights.map(insight => (
          <div
            key={insight.id}
            className={`card border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer ${TREND_BG[insight.trend]}`}
            onClick={() => openPlayground(insight.sql)}
          >
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                insight.trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                insight.trend === 'down' ? 'bg-red-100 text-red-700' :
                insight.trend === 'warn' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {insight.icon}
              </div>
              <TrendIcon trend={insight.trend} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{insight.title}</p>
              <p className={`text-xl font-bold mt-1 truncate ${TREND_VALUE[insight.trend]}`}>{insight.value}</p>
              <p className="text-xs text-slate-500 mt-1">{insight.sub}</p>
            </div>

            {insight.detail && (
              <div className="border-t border-slate-200/60 pt-2.5 space-y-1">
                {insight.detail.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-600 truncate max-w-36">{d.label}</span>
                    <span className="font-semibold text-slate-700 ml-2 flex-shrink-0">{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 mt-auto">
              <ExternalLink className="w-3 h-3" />
              <span>{t('insights.viewSQL')}</span>
            </div>
          </div>
        ))}

        {insights.length === 0 && (
          <div className="col-span-3 card p-12 text-center">
            <p className="text-slate-400 text-sm">{t('insights.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
