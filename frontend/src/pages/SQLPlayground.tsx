import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Play, ShieldCheck, AlertCircle, CheckCircle2, XCircle, ChevronRight, BookmarkPlus, X } from 'lucide-react'
import { useLang } from '../context/LangContext'
import SqlBlock from '../components/SqlBlock'
import SafetyBadge from '../components/SafetyBadge'
import DataTable from '../components/DataTable'
import ChartRenderer from '../components/ChartRenderer'
import { validateSQL, executeSQL, recommendChart, addFewShotExample } from '../api/client'
import type { SQLValidateResponse, SQLExecuteResponse, ChartRecommendation } from '../types/api'

const PRESET_QUERIES = [
  {
    label: 'Monthly revenue',
    sql: `SELECT DATE_TRUNC('month', paid_at)::VARCHAR AS month,
       ROUND(SUM(amount), 2) AS revenue,
       COUNT(*) AS transactions
FROM payments
WHERE status = 'completed' AND paid_at IS NOT NULL
GROUP BY 1 ORDER BY 1 LIMIT 12`,
  },
  {
    label: 'Top customers',
    sql: `SELECT c.name, c.city, c.segment,
       ROUND(SUM(p.amount), 2) AS total_spent,
       COUNT(DISTINCT o.order_id) AS orders
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN payments p ON o.order_id = p.order_id
WHERE p.status = 'completed'
GROUP BY c.customer_id, c.name, c.city, c.segment
ORDER BY total_spent DESC LIMIT 10`,
  },
  {
    label: 'Product performance',
    sql: `SELECT p.name, p.category,
       SUM(oi.quantity) AS units_sold,
       ROUND(SUM(oi.line_total), 2) AS revenue,
       ROUND(AVG(r.score), 2) AS avg_rating
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN reviews r ON p.product_id = r.product_id
GROUP BY p.product_id, p.name, p.category
ORDER BY revenue DESC LIMIT 15`,
  },
  {
    label: 'Order status breakdown',
    sql: `SELECT status,
       COUNT(*) AS order_count,
       ROUND(SUM(total_amount), 2) AS total_value,
       ROUND(AVG(total_amount), 2) AS avg_value
FROM orders
GROUP BY status ORDER BY order_count DESC`,
  },
  {
    label: 'DQ: payment nulls',
    sql: `SELECT
  COUNT(*) AS total_payments,
  COUNT(paid_at) AS with_paid_at,
  COUNT(*) - COUNT(paid_at) AS null_paid_at,
  ROUND(100.0 * (COUNT(*) - COUNT(paid_at)) / COUNT(*), 2) AS null_pct
FROM payments`,
  },
  {
    label: 'MoM growth (unsafe demo)',
    sql: `DROP TABLE payments`,
  },
]

const VALIDATION_CHECKS = [
  { key: 'no_null_bytes', label: 'No null bytes' },
  { key: 'no_comments', label: 'No comment injection' },
  { key: 'no_forbidden_kw', label: 'No forbidden keywords' },
  { key: 'single_statement', label: 'Single statement' },
  { key: 'select_only', label: 'SELECT only' },
  { key: 'whitelisted_tables', label: 'Whitelisted tables only' },
]

export default function SQLPlayground() {
  const { t } = useLang()
  const location = useLocation()
  const [sql, setSql] = useState((location.state as { sql?: string } | null)?.sql ?? PRESET_QUERIES[0].sql)
  const [validation, setValidation] = useState<SQLValidateResponse | null>(null)
  const [execResult, setExecResult] = useState<SQLExecuteResponse | null>(null)
  const [chart, setChart] = useState<ChartRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [showFewShotModal, setShowFewShotModal] = useState(false)
  const [fewShotQuestion, setFewShotQuestion] = useState('')
  const [fewShotStatus, setFewShotStatus] = useState<string | null>(null)

  // Accept SQL injected via navigation state (e.g., from InsightCards)
  useEffect(() => {
    const injected = (location.state as { sql?: string } | null)?.sql
    if (injected) setSql(injected)
  }, [location.state])

  const handleValidate = async () => {
    setValidating(true)
    try {
      const res = await validateSQL(sql)
      setValidation(res)
    } finally {
      setValidating(false)
    }
  }

  const handleExecute = async () => {
    setLoading(true)
    setExecResult(null)
    setChart(null)
    try {
      const res = await executeSQL(sql, 500)
      setExecResult(res)
      if (res.columns && res.rows && res.rows.length > 0) {
        try {
          const rec = await recommendChart(
            res.columns.map(c => ({ name: c, dtype: 'VARCHAR' })),
            res.row_count
          )
          setChart(rec)
        } catch { /* ignore chart errors */ }
      }
    } finally {
      setLoading(false)
    }
  }

  // Map validation result to per-check status
  const getChecks = () => {
    if (!validation) return null
    const issues = validation.issues.join(' ').toLowerCase()
    return VALIDATION_CHECKS.map((c) => {
      let passed = true
      if (!validation.is_safe) {
        if (c.key === 'no_forbidden_kw' && issues.includes('keyword')) passed = false
        else if (c.key === 'no_comments' && issues.includes('comment')) passed = false
        else if (c.key === 'no_null_bytes' && issues.includes('null')) passed = false
        else if (c.key === 'single_statement' && issues.includes('multiple')) passed = false
        else if (c.key === 'select_only' && issues.includes('forbidden statement')) passed = false
        else if (c.key === 'whitelisted_tables' && issues.includes('whitelisted')) passed = false
      }
      return { ...c, passed }
    })
  }

  const checks = getChecks()

  const handleSaveFewShot = async () => {
    if (!fewShotQuestion.trim()) return
    try {
      const res = await addFewShotExample(fewShotQuestion.trim(), sql)
      if (res.success) {
        setFewShotStatus(t('playground.fewShotSaved') + ` (${res.total_examples} total)`)
      } else {
        setFewShotStatus(t('playground.fewShotDuplicate'))
      }
      setShowFewShotModal(false)
      setFewShotQuestion('')
      setTimeout(() => setFewShotStatus(null), 4000)
    } catch {
      setFewShotStatus('Save failed')
      setTimeout(() => setFewShotStatus(null), 3000)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('playground.title')}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t('playground.subtitle')}</p>
      </div>

      {/* Few-shot save modal */}
      {showFewShotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-slate-800">{t('playground.saveAsFewShot')}</p>
              <button onClick={() => setShowFewShotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">{t('playground.fewShotQuestion')}</p>
            <textarea
              value={fewShotQuestion}
              onChange={e => setFewShotQuestion(e.target.value)}
              placeholder="e.g. Show me top 10 customers by revenue"
              rows={2}
              className="input resize-none mb-3"
              autoFocus
            />
            <p className="text-xs text-slate-400 mb-4">SQL: <code className="text-[10px] text-slate-500">{sql.trim().slice(0, 60)}…</code></p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowFewShotModal(false)} className="btn-secondary text-sm">
                {t('playground.fewShotCancel')}
              </button>
              <button onClick={handleSaveFewShot} disabled={!fewShotQuestion.trim()} className="btn-primary text-sm">
                {t('playground.fewShotConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Few-shot status toast */}
      {fewShotStatus && (
        <div className="card p-3 border-emerald-200 bg-emerald-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-sm text-emerald-700">{fewShotStatus}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Editor */}
        <div className="xl:col-span-3 space-y-4">
          <div className="card p-4" data-journey="sql-editor">
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">{t('playground.sqlEditor')}</p>
              <div className="flex gap-2">
                {execResult && !execResult.error && (
                  <button
                    onClick={() => setShowFewShotModal(true)}
                    className="btn-secondary text-xs"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    {t('playground.saveAsFewShot')}
                  </button>
                )}
                <button onClick={handleValidate} disabled={validating} className="btn-secondary">
                  <ShieldCheck className="w-4 h-4" />
                  {validating ? t('playground.validating') : t('playground.validate')}
                </button>
                <button onClick={handleExecute} disabled={loading} className="btn-primary">
                  {loading
                    ? <><div className="spinner" style={{ width: 14, height: 14 }} /> {t('playground.running')}</>
                    : <><Play className="w-4 h-4" /> {t('playground.execute')}</>
                  }
                </button>
              </div>
            </div>
            <textarea
              value={sql}
              onChange={(e) => { setSql(e.target.value); setValidation(null) }}
              rows={12}
              spellCheck={false}
              className="w-full font-mono text-sm bg-slate-900 text-slate-100 rounded-lg p-4
                         border-0 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Validation result */}
          {validation && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="section-title">{t('playground.validationResult')}</p>
                <SafetyBadge
                  isSafe={validation.is_safe}
                  riskLevel={validation.risk_level}
                  size="sm"
                />
              </div>
              {checks && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {checks.map((c) => (
                    <div key={c.key} className="flex items-center gap-2 text-xs">
                      {c.passed
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      }
                      <span className={c.passed ? 'text-slate-600' : 'text-red-600 font-medium'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {validation.issues.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  {validation.issues.map((iss, i) => (
                    <p key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {iss}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Execution result */}
          {execResult && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="section-title">{t('playground.queryResults')}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{execResult.row_count.toLocaleString()} rows</span>
                  {execResult.execution_time_ms && (
                    <span>{execResult.execution_time_ms.toFixed(1)}ms</span>
                  )}
                  <SafetyBadge isSafe={execResult.is_safe} size="sm" />
                </div>
              </div>

              {execResult.error ? (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-700">{execResult.error}</p>
                </div>
              ) : execResult.rows.length > 0 ? (
                <>
                  {chart && chart.chart_type !== 'table' && (
                    <div className="border-b border-slate-100 pb-4 mb-4">
                      <ChartRenderer
                        recommendation={chart}
                        columns={execResult.columns}
                        rows={execResult.rows}
                      />
                    </div>
                  )}
                  <DataTable
                    columns={execResult.columns}
                    rows={execResult.rows}
                    maxHeight={320}
                    downloadName="sql-playground"
                  />
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">{t('playground.noRows')}</p>
              )}
            </div>
          )}
        </div>

        {/* Presets */}
        <div className="xl:col-span-1">
          <div className="card p-4 sticky top-0">
            <p className="section-title">{t('playground.presetQueries')}</p>
            <div className="space-y-1">
              {PRESET_QUERIES.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setSql(p.sql); setValidation(null); setExecResult(null) }}
                  className="w-full flex items-center justify-between text-left text-xs
                             text-slate-600 hover:text-blue-700 hover:bg-blue-50
                             px-3 py-2 rounded-lg transition-colors"
                >
                  <span>{p.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700 font-medium mb-1">{t('playground.securityNote')}</p>
              <p className="text-xs text-amber-600">{t('playground.securityDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
