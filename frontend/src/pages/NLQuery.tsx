import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Send, Loader2, BarChart2, Table, AlertCircle, Lightbulb,
  Cpu, ServerCrash, MessageSquare, PinIcon, PinOff, Download,
  RotateCcw, CheckCircle2, ChevronRight, ChevronDown,
} from 'lucide-react'
import { useLang } from '../context/LangContext'
import SqlBlock from '../components/SqlBlock'
import SafetyBadge from '../components/SafetyBadge'
import DataTable from '../components/DataTable'
import ChartRenderer from '../components/ChartRenderer'
import MetricCard from '../components/MetricCard'
import { runNLQuery, addFewShotExample, getHealth } from '../api/client'
import type { NLQueryResponse, ConversationMessage, PinnedQuery } from '../types/api'

type View = 'chart' | 'table'

interface TurnResult {
  question: string
  response: NLQueryResponse
  view: View
}

const PINNED_KEY = 'agentic-bi-pinned-queries'

function loadPinned(): PinnedQuery[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') } catch { return [] }
}
function savePinned(items: PinnedQuery[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(items))
}

export default function NLQuery() {
  const { t } = useLang()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [turns, setTurns] = useState<TurnResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pinned, setPinned] = useState<PinnedQuery[]>(loadPinned)
  const [showPinned, setShowPinned] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [fewShotStatus, setFewShotStatus] = useState<string | null>(null)
  const [llmOnline, setLlmOnline] = useState<boolean | null>(null)
  const [llmProvider, setLlmProvider] = useState<string>('unknown')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHealth().then(h => {
      setLlmProvider(h.llm_provider)
      setLlmOnline(h.llm_reachable)
    }).catch(() => setLlmOnline(false))
  }, [])

  // Build conversation history from prior turns for multi-turn
  const buildHistory = (): ConversationMessage[] => {
    const msgs: ConversationMessage[] = []
    for (const turn of turns) {
      msgs.push({ role: 'user', content: turn.question })
      if (turn.response.sql && turn.response.is_safe) {
        msgs.push({ role: 'assistant', content: turn.response.sql })
      }
    }
    return msgs
  }

  const submit = useCallback(async (q?: string) => {
    const query = q ?? question
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setFewShotStatus(null)
    try {
      const history = buildHistory()
      const res = await runNLQuery(query, 500, history)
      const defaultView: View = res.chart_recommendation ? 'chart' : 'table'
      setTurns(prev => [...prev, { question: query, response: res, view: defaultView }])
      setQuestion('')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [question, turns])

  const clearChat = () => { setTurns([]); setError(null); setQuestion('') }

  const setTurnView = (idx: number, v: View) => {
    setTurns(prev => prev.map((t, i) => i === idx ? { ...t, view: v } : t))
  }

  // Pinning
  const isPinned = (q: string) => pinned.some(p => p.question === q)
  const togglePin = (turn: TurnResult) => {
    if (isPinned(turn.question)) {
      const updated = pinned.filter(p => p.question !== turn.question)
      setPinned(updated); savePinned(updated)
    } else {
      const item: PinnedQuery = {
        id: Date.now().toString(),
        question: turn.question,
        sql: turn.response.sql,
        chart_recommendation: turn.response.chart_recommendation,
        pinned_at: new Date().toISOString(),
        row_count: turn.response.row_count,
      }
      const updated = [item, ...pinned]
      setPinned(updated); savePinned(updated)
    }
  }
  const removePin = (id: string) => {
    const updated = pinned.filter(p => p.id !== id)
    setPinned(updated); savePinned(updated)
  }
  const rerunPinned = (q: string) => { setQuestion(q); submit(q) }

  // PDF export
  const exportPdf = async () => {
    if (turns.length === 0 || !resultsRef.current) return
    setExportingPdf(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(resultsRef.current, { scale: 1.5, useCORS: true, backgroundColor: '#f8fafc' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.setFontSize(12)
      pdf.text('Agentic BI — NL Query Export', 10, 12)
      pdf.setFontSize(8)
      pdf.text(new Date().toLocaleString(), 10, 18)
      let yPos = 24
      let remaining = imgHeight
      while (remaining > 0) {
        const pageHeight = pdf.internal.pageSize.getHeight() - yPos - 10
        const sliceH = Math.min(remaining, pageHeight)
        const srcY = (imgHeight - remaining) / imgHeight * canvas.height
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = (sliceH / imgHeight) * canvas.height
        const ctx = sliceCanvas.getContext('2d')
        ctx?.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height)
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, yPos, imgWidth, sliceH)
        remaining -= sliceH
        if (remaining > 0) { pdf.addPage(); yPos = 10 }
      }
      pdf.save(`nl-query-${Date.now()}.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  // Save as few-shot from last successful turn
  const saveFewShot = async (turn: TurnResult) => {
    if (!turn.response.is_safe || !turn.response.sql) return
    try {
      const res = await addFewShotExample(turn.question, turn.response.sql)
      setFewShotStatus(res.success ? t('playground.fewShotSaved') : t('playground.fewShotDuplicate'))
      setTimeout(() => setFewShotStatus(null), 3000)
    } catch { /* silent */ }
  }

  const isLlamaCppError = (msg: string | null) => msg?.includes('llama.cpp server not reachable') ?? false

  const adapterLabel = (name: string) => {
    if (name === 'llama_cpp') return { text: 'llama.cpp', color: 'bg-violet-100 text-violet-700' }
    if (name.startsWith('openai')) return { text: name, color: 'bg-emerald-100 text-emerald-700' }
    if (name === 'rule_based') return { text: 'SmartQuery', color: 'bg-indigo-100 text-indigo-700' }
    return { text: name, color: 'bg-slate-100 text-slate-600' }
  }

  const pickExample = (ex: string) => { setQuestion(ex); textareaRef.current?.focus() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{t('nlquery.title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t('nlquery.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {turns.length > 0 && (
            <>
              <button
                onClick={exportPdf}
                disabled={exportingPdf}
                className="btn-secondary text-xs"
              >
                {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {t('nlquery.export')}
              </button>
              <button onClick={clearChat} className="btn-secondary text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                {t('nlquery.newChat')}
              </button>
            </>
          )}
          <button
            onClick={() => setShowPinned(v => !v)}
            className={`btn-secondary text-xs relative ${pinned.length > 0 ? 'text-amber-600' : ''}`}
          >
            <PinIcon className="w-3.5 h-3.5" />
            {t('nlquery.pinnedQueries')}
            {pinned.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                {pinned.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* LLM status banner */}
      {llmOnline !== null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
          llmOnline && llmProvider === 'llama_cpp'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : llmProvider === 'rule_based'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            llmOnline && llmProvider === 'llama_cpp'
              ? 'bg-blue-500'
              : llmProvider === 'rule_based'
              ? 'bg-indigo-500'
              : 'bg-amber-400'
          }`} />
          {llmOnline && llmProvider === 'llama_cpp'
            ? 'Qwen2.5-7B 已連線 — 完整自然語言查詢支援，可輸入任意問題'
            : llmProvider === 'rule_based'
            ? 'Demo 模式 — SmartQuery 引擎已就緒，支援 10+ 種業務分析，點擊右側範例立即體驗'
            : 'LLM 目前離線 — 使用關鍵字模板模式，請參考下方範例查詢'}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Main conversation area */}
        <div className="xl:col-span-3 space-y-4">

          {/* Conversation history indicator */}
          {turns.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-slate-500">
                {t('nlquery.conversationMode')} · {turns.length} {turns.length === 1 ? 'turn' : 'turns'}
              </span>
            </div>
          )}

          {/* Input box */}
          <div className="card p-4" data-journey="nl-input">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              placeholder={turns.length > 0
                ? '繼續追問，例如「只看去年的資料」或「按品類篩選」...'
                : t('nlquery.placeholder')}
              rows={3}
              className="input resize-none"
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-slate-400">{t('nlquery.shortcut')}</p>
              <button
                onClick={() => submit()}
                disabled={loading || !question.trim()}
                className="btn-primary"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? t('nlquery.running') : t('nlquery.run')}
              </button>
            </div>
          </div>

          {/* Network error */}
          {error && (
            <div className="card p-4 border-red-200 bg-red-50 flex gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Few-shot save status toast */}
          {fewShotStatus && (
            <div className="card p-3 border-emerald-200 bg-emerald-50 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-sm text-emerald-700">{fewShotStatus}</p>
            </div>
          )}

          {/* Pinned queries panel */}
          {showPinned && (
            <div className="card p-4 border-amber-100 bg-amber-50">
              <p className="section-title mb-3">{t('nlquery.pinnedQueries')}</p>
              {pinned.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">{t('nlquery.noPinned')}</p>
              ) : (
                <div className="space-y-2">
                  {pinned.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">{p.question}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.row_count} rows · {new Date(p.pinned_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => rerunPinned(p.question)}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                        >
                          <ChevronRight className="w-3 h-3" /> Re-run
                        </button>
                        <button
                          onClick={() => removePin(p.id)}
                          className="text-xs text-slate-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50"
                        >
                          <PinOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All conversation turns */}
          <div ref={resultsRef} className="space-y-6">
            {turns.map((turn, idx) => {
              const result = turn.response
              return (
                <div key={idx} className="space-y-3">
                  {/* Turn header */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-blue-100 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                      Q{idx + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-700">{turn.question}</p>
                  </div>

                  {/* llama.cpp server not running warning */}
                  {isLlamaCppError(result.error) && (
                    <div className="card p-4 border-violet-200 bg-violet-50 flex gap-3">
                      <ServerCrash className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-violet-800">llama.cpp server is not running</p>
                        <p className="text-xs text-violet-600 mt-1">
                          Start it: <code className="bg-violet-100 px-1 rounded font-mono">./scripts/start_llm.sh</code>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metrics strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card p-3">
                      <SafetyBadge isSafe={result.is_safe} riskLevel={result.is_safe ? 'safe' : 'critical'} size="sm" />
                      <p className="text-[10px] text-slate-400 mt-1">{t('nlquery.sqlSafety')}</p>
                    </div>
                    <div className="card p-3">
                      <p className="text-lg font-bold text-slate-800">{result.row_count.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">{t('nlquery.rowsReturned')}</p>
                    </div>
                    <div className="card p-3">
                      <p className="text-lg font-bold text-slate-800">
                        {result.execution_time_ms ? `${result.execution_time_ms.toFixed(0)}ms` : '—'}
                      </p>
                      <p className="text-[10px] text-slate-400">{t('nlquery.execTime')}</p>
                    </div>
                    <div className="card p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-slate-400" />
                        {(() => { const a = adapterLabel(result.adapter); return (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${a.color}`}>{a.text}</span>
                        )})()}
                      </div>
                      <p className="text-[10px] text-slate-400">LLM backend</p>
                    </div>
                  </div>

                  {/* SQL block */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="section-title mb-0">{t('nlquery.generatedSQL')}</p>
                      <div className="flex items-center gap-2">
                        {/* Pin button */}
                        {result.is_safe && result.rows.length > 0 && (
                          <button
                            onClick={() => togglePin(turn)}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                              isPinned(turn.question)
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            {isPinned(turn.question) ? <PinOff className="w-3 h-3" /> : <PinIcon className="w-3 h-3" />}
                            {isPinned(turn.question) ? t('nlquery.unpin') : t('nlquery.pin')}
                          </button>
                        )}
                        {/* Save as few-shot */}
                        {result.is_safe && result.sql && !result.sql.startsWith('--') && (
                          <button
                            onClick={() => saveFewShot(turn)}
                            className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {t('playground.saveAsFewShot')}
                          </button>
                        )}
                      </div>
                    </div>
                    <SqlBlock sql={result.sql} />
                    {!result.is_safe && result.safety_issues.length > 0 && (
                      <div className="mt-3">
                        <SafetyBadge isSafe={false} riskLevel="critical" issues={result.safety_issues} />
                      </div>
                    )}
                  </div>

                  {/* Results */}
                  {result.is_safe && result.rows.length > 0 && (
                    <div className="card p-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="section-title">{t('nlquery.results')}</p>
                        {result.chart_recommendation && (
                          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                            <button
                              onClick={() => setTurnView(idx, 'chart')}
                              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                turn.view === 'chart' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <BarChart2 className="w-3.5 h-3.5" /> Chart
                            </button>
                            <button
                              onClick={() => setTurnView(idx, 'table')}
                              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                turn.view === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Table className="w-3.5 h-3.5" /> Table
                            </button>
                          </div>
                        )}
                      </div>

                      {turn.view === 'chart' && result.chart_recommendation && (
                        <ChartRenderer
                          recommendation={result.chart_recommendation}
                          columns={result.columns}
                          rows={result.rows}
                        />
                      )}

                      <div className={turn.view === 'table' || !result.chart_recommendation ? '' : 'mt-4 border-t border-slate-100 pt-4'}>
                        {(turn.view === 'table' || !result.chart_recommendation) && (
                          <DataTable columns={result.columns} rows={result.rows} maxHeight={350} downloadName={`nl-q${idx + 1}`} />
                        )}
                      </div>
                    </div>
                  )}

                  {result.is_safe && result.rows.length === 0 && !result.error && (
                    <div className="card p-6 text-center text-slate-400 text-sm">{t('nlquery.noRows')}</div>
                  )}

                  {result.error && !isLlamaCppError(result.error) && (
                    <div className="card p-4 border-amber-200 bg-amber-50">
                      <p className="text-sm text-amber-700 font-medium">{t('nlquery.execNote')}</p>
                      <p className="text-sm text-amber-600 mt-1">{result.error}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1">
          <div className="card p-4 sticky top-0">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <p className="section-title mb-0">{t('nlquery.examples')}</p>
            </div>
            <div className="space-y-1.5">
              {(['ex1','ex2','ex3','ex4','ex5','ex6','ex7','ex8','ex9','ex10'] as const).map((key) => {
                const ex = t(`nlquery.${key}`)
                return (
                  <button
                    key={key}
                    onClick={() => { pickExample(ex); submit(ex) }}
                    className="w-full text-left text-xs text-slate-600 hover:text-blue-700
                               hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors
                               border border-transparent hover:border-blue-100"
                  >
                    {ex}
                  </button>
                )
              })}
            </div>

            {/* Conversation flow indicator */}
            {turns.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> 對話記錄
                </p>
                <div className="space-y-1">
                  {turns.map((turn, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[9px] bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-bold mt-0.5 flex-shrink-0">Q{i+1}</span>
                      <p className="text-[10px] text-slate-500 leading-tight truncate">{turn.question}</p>
                    </div>
                  ))}
                </div>
                <button onClick={clearChat} className="mt-2 text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> {t('nlquery.newChat')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
