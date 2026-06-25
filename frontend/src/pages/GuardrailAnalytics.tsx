import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, RefreshCw, Clock, TrendingUp, AlertTriangle } from 'lucide-react'
import { useLang } from '../context/LangContext'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar,
  PolarAngleAxis, Cell,
} from 'recharts'
import { executeSQL } from '../api/client'
import DataFreshness from '../components/DataFreshness'

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']

function categorizeError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('keyword')) return 'Forbidden Keyword'
  if (m.includes('multiple') || m.includes('statement')) return 'Multi-Statement'
  if (m.includes('whitelisted') || m.includes('table')) return 'Table Whitelist'
  if (m.includes('select *') || m.includes('select*')) return 'Unsafe SELECT *'
  if (m.includes('comment')) return 'Comment Injection'
  if (m.includes('null byte')) return 'Null Byte'
  return 'Other'
}

interface AnomalyAlert {
  metric: string
  label: string
  zScore: number
  current: number
  mean: number
  severity: 'warning' | 'critical'
}

function detectAnomalies(
  trend: { day: string; safe_count: number; blocked_count: number }[],
  safeRate: number,
): AnomalyAlert[] {
  if (trend.length < 5) return []
  const alerts: AnomalyAlert[] = []

  // Z-score helper
  const zScore = (values: number[], current: number) => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
    return std > 0 ? { z: (current - mean) / std, mean } : null
  }

  const history = trend.slice(0, -1)  // exclude today
  const today = trend[trend.length - 1]

  // Anomaly: blocked count
  const blockedHistory = history.map(d => d.blocked_count)
  const blockedZ = zScore(blockedHistory, today.blocked_count)
  if (blockedZ && blockedZ.z > 2) {
    alerts.push({
      metric: 'blocked',
      label: '阻擋查詢數異常偏高',
      zScore: Math.round(blockedZ.z * 10) / 10,
      current: today.blocked_count,
      mean: Math.round(blockedZ.mean * 10) / 10,
      severity: blockedZ.z > 3 ? 'critical' : 'warning',
    })
  }

  // Anomaly: total query volume
  const totalHistory = history.map(d => d.safe_count + d.blocked_count)
  const todayTotal = today.safe_count + today.blocked_count
  const volZ = zScore(totalHistory, todayTotal)
  if (volZ && Math.abs(volZ.z) > 2.5) {
    alerts.push({
      metric: 'volume',
      label: volZ.z > 0 ? '查詢量異常偏高' : '查詢量異常偏低',
      zScore: Math.round(volZ.z * 10) / 10,
      current: todayTotal,
      mean: Math.round(volZ.mean * 10) / 10,
      severity: Math.abs(volZ.z) > 3 ? 'critical' : 'warning',
    })
  }

  // Anomaly: safety rate (compute per-day rate from history)
  const rateHistory = history.map(d => {
    const total = d.safe_count + d.blocked_count
    return total > 0 ? (d.safe_count / total) * 100 : 100
  })
  const rateZ = zScore(rateHistory, safeRate)
  if (rateZ && rateZ.z < -2) {
    alerts.push({
      metric: 'safeRate',
      label: '安全率異常偏低',
      zScore: Math.round(rateZ.z * 10) / 10,
      current: Math.round(safeRate),
      mean: Math.round(rateZ.mean),
      severity: rateZ.z < -3 ? 'critical' : 'warning',
    })
  }

  return alerts
}

function bucketMs(values: number[], bucketSize = 50) {
  const counts: Record<number, number> = {}
  for (const v of values) {
    const b = Math.floor(v / bucketSize) * bucketSize
    counts[b] = (counts[b] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bucket, count]) => ({ bucket: `${bucket}ms`, count }))
}

export default function GuardrailAnalytics() {
  const { t } = useLang()
  const [safeData, setSafeData] = useState<{ safe: number; blocked: number } | null>(null)
  const [reasonData, setReasonData] = useState<{ category: string; count: number }[]>([])
  const [trendData, setTrendData] = useState<{ day: string; safe_count: number; blocked_count: number }[]>([])
  const [histData, setHistData] = useState<{ bucket: string; count: number }[]>([])
  const [blockedQueries, setBlockedQueries] = useState<{ sql: string; error: string }[]>([])
  const [hourlyData, setHourlyData] = useState<{ hour: number; queries: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [safeRes, reasonRes, trendRes, histRes, recentBlocked, hourlyRes] = await Promise.all([
        executeSQL(`SELECT is_safe, COUNT(*) AS count FROM query_history GROUP BY is_safe`, 10).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT error_message, COUNT(*) AS count FROM query_history WHERE NOT is_safe AND error_message IS NOT NULL GROUP BY error_message ORDER BY count DESC LIMIT 20`, 20).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT DATE_TRUNC('day', timestamp)::VARCHAR AS day, SUM(CASE WHEN is_safe THEN 1 ELSE 0 END) AS safe_count, SUM(CASE WHEN NOT is_safe THEN 1 ELSE 0 END) AS blocked_count FROM query_history GROUP BY 1 ORDER BY 1`, 90).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT execution_time_ms FROM query_history WHERE execution_time_ms IS NOT NULL AND is_safe = true LIMIT 500`, 500).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT sql, error_message FROM query_history WHERE NOT is_safe AND error_message IS NOT NULL ORDER BY id DESC LIMIT 5`, 5).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
        executeSQL(`SELECT EXTRACT(HOUR FROM timestamp)::INT AS hour, COUNT(*) AS queries FROM query_history GROUP BY hour ORDER BY hour`, 24).catch(() => ({ error: 'fetch-failed', rows: [] as (string|number|null)[][], columns: [], row_count: 0, sql: '', execution_time_ms: null, is_safe: false })),
      ])

      if (!safeRes.error && safeRes.rows.length > 0) {
        let safe = 0, blocked = 0
        for (const row of safeRes.rows) {
          if (row[0] === 1 || String(row[0]) === 'true') safe = Number(row[1])
          else blocked = Number(row[1])
        }
        setSafeData({ safe, blocked })
      }

      if (!reasonRes.error && reasonRes.rows.length > 0) {
        const categories: Record<string, number> = {}
        for (const row of reasonRes.rows) {
          const cat = categorizeError(String(row[0] ?? ''))
          categories[cat] = (categories[cat] ?? 0) + Number(row[1])
        }
        setReasonData(Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count })))
      }

      if (!trendRes.error && trendRes.rows.length > 0) {
        setTrendData(trendRes.rows.map(r => ({
          day: String(r[0] ?? '').slice(5, 10),
          safe_count: Number(r[1]),
          blocked_count: Number(r[2]),
        })))
      }

      if (!histRes.error && histRes.rows.length > 0) {
        const values = histRes.rows.map(r => Number(r[0])).filter(v => v > 0 && v < 2000)
        setHistData(bucketMs(values, 50))
      }

      if (!recentBlocked.error && recentBlocked.rows.length > 0) {
        setBlockedQueries(recentBlocked.rows.map(r => ({ sql: String(r[0] ?? ''), error: String(r[1] ?? '') })))
      }

      if (!hourlyRes.error && hourlyRes.rows.length > 0) {
        setHourlyData(hourlyRes.rows.map(r => ({ hour: Number(r[0]), queries: Number(r[1]) })))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const total = (safeData?.safe ?? 0) + (safeData?.blocked ?? 0)
  const safeRate = total > 0 && safeData ? Math.round((safeData.safe / total) * 100) : 0
  const gaugeColor = safeRate >= 90 ? '#10b981' : safeRate >= 70 ? '#f59e0b' : '#ef4444'
  const gaugeData = [{ value: safeRate, fill: gaugeColor }]
  const anomalies = detectAnomalies(trendData, safeRate)

  if (loading) return <div className="flex items-center gap-3 text-slate-500 p-8"><div className="spinner" /> {t('guardrails.loading')}</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('guardrails.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('guardrails.subtitle')}</p>
          <DataFreshness tables={['query_history']} />
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /> {t('common.refresh')}</button>
      </div>

      {/* Anomaly detection alerts */}
      {anomalies.length > 0 ? (
        <div className="space-y-2">
          {anomalies.map((a, i) => (
            <div
              key={i}
              className={`card p-4 flex items-start gap-3 ${
                a.severity === 'critical'
                  ? 'border-red-200 bg-red-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className={`text-sm font-semibold ${a.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
                  {a.label}
                </p>
                <p className={`text-xs mt-0.5 ${a.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                  當前值 {a.current} · 歷史均值 {a.mean} · Z-score {a.zScore > 0 ? '+' : ''}{a.zScore}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : total > 10 ? (
        <div className="card p-3 border-emerald-100 bg-emerald-50 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-emerald-700">{t('anomaly.noAnomaly')}</p>
        </div>
      ) : null}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="metric-card">
          <p className="metric-value">{total.toLocaleString()}</p>
          <p className="metric-label">{t('guardrails.kpi.total')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value text-emerald-600">{safeData?.safe.toLocaleString() ?? 0}</p>
          <p className="metric-label">{t('guardrails.kpi.safe')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value text-red-500">{safeData?.blocked.toLocaleString() ?? 0}</p>
          <p className="metric-label">{t('guardrails.kpi.blocked')}</p>
        </div>
        <div className="metric-card">
          <p className="metric-value" style={{ color: gaugeColor }}>{safeRate}%</p>
          <p className="metric-label">{t('guardrails.kpi.safetyRate')}</p>
        </div>
      </div>

      {/* Gauge + Reason bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-journey="safety-gauge">
        {/* Radial Gauge */}
        <div className="card p-5">
          <p className="section-title">{t('guardrails.gauge')}</p>
          <div className="relative flex items-center justify-center" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart
                innerRadius="65%"
                outerRadius="90%"
                data={gaugeData}
                startAngle={210}
                endAngle={-30}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar dataKey="value" angleAxisId={0} background={{ fill: '#f1f5f9' }} cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold" style={{ color: gaugeColor }}>{safeRate}%</p>
              <p className="text-xs text-slate-400 mt-1">Safe Rate</p>
              <div className="flex items-center gap-1 mt-2">
                {safeRate >= 90
                  ? <><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Excellent</span></>
                  : safeRate >= 70
                    ? <><ShieldAlert className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Warning</span></>
                    : <><ShieldAlert className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-600 font-medium">Critical</span></>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Blocked reason bars */}
        <div className="card p-5">
          <p className="section-title">{t('guardrails.blockReasons')}</p>
          {reasonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reasonData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} width={115} />
                <Tooltip formatter={(v: number) => [v, 'blocked queries']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {reasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-16">{t('guardrails.noBlocked')}</p>
          )}
        </div>
      </div>

      {/* Daily trend area chart */}
      <div className="card p-5" data-journey="safety-trend">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <p className="section-title mb-0">{t('guardrails.dailyTrend')}</p>
        </div>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="safe_count" stackId="a" stroke="#10b981" fill="url(#colorSafe)" name="Safe" />
              <Area type="monotone" dataKey="blocked_count" stackId="a" stroke="#ef4444" fill="url(#colorBlocked)" name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('guardrails.noHistory')}</p>
        )}
      </div>

      {/* Execution time histogram + Recent blocked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="section-title mb-0">{t('guardrails.execTimeDist')}</p>
          </div>
          {histData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={histData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'queries']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-16">No timing data yet.</p>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title">{t('guardrails.recentBlocked')}</p>
          {blockedQueries.length > 0 ? (
            <div className="space-y-2">
              {blockedQueries.map((q, i) => (
                <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-mono text-slate-700 truncate">{q.sql.trim().slice(0, 60)}</p>
                  <p className="text-[10px] text-red-600 mt-1">{q.error.slice(0, 80)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">{t('guardrails.noBlockedList')}</p>
          )}
        </div>
      </div>

      {/* Hourly query volume */}
      <div className="card p-5">
        <p className="section-title">{t('guardrails.hourlyVolume')}</p>
        {hourlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: number) => `${v}:00`} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, 'queries']} labelFormatter={(l: number) => `${l}:00–${l + 1}:00`} />
              <Bar dataKey="queries" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-10">{t('guardrails.noHourlyData')}</p>
        )}
      </div>
    </div>
  )
}
