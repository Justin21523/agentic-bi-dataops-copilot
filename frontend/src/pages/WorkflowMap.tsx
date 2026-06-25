import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, MousePointerClick } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { JOURNEY_STEPS, type JourneyStep } from '../data/journeySteps'

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', red: '#ef4444', emerald: '#10b981',
  purple: '#8b5cf6', indigo: '#6366f1', amber: '#f59e0b',
}

const STEP_BY_ID: Record<string, JourneyStep> = Object.fromEntries(
  JOURNEY_STEPS.map(s => [s.id, s]),
)

// Pipeline phases. `etl` is the hub; band 1 fans out into 4 analytics branches,
// which converge into governance + insight in band 2.
interface Phase { key: string; nodes: string[] }
const BAND_DATA: Phase = { key: 'data', nodes: ['raw-data', 'quality', 'etl'] }
const BAND_BRANCHES: Phase[] = [
  { key: 'customer', nodes: ['rfm', 'segment', 'ltv'] },
  { key: 'product', nodes: ['bcg', 'discount'] },
  { key: 'behavior', nodes: ['funnel', 'cohort'] },
  { key: 'query', nodes: ['nl-query', 'query-exec', 'history'] },
]
const BAND_OUTCOME: Phase[] = [
  { key: 'governance', nodes: ['guardrail', 'trend'] },
  { key: 'insight', nodes: ['insight'] },
]

export default function WorkflowMap() {
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const label = (s: JourneyStep) => (lang === 'zh' ? s.title : s.title_en)

  // Navigate to the stage's page, then scroll to and briefly highlight its chart.
  // Reuses the existing data-journey targets + .journey-highlight CSS class.
  function focusStage(step: JourneyStep) {
    navigate(step.route)
    const tryFocus = (n = 0) => {
      const el = document.querySelector(`[data-journey="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('journey-highlight')
        setTimeout(() => el.classList.remove('journey-highlight'), 2200)
      } else if (n < 25) {
        setTimeout(() => tryFocus(n + 1), 120)
      }
    }
    setTimeout(() => tryFocus(), 200)
  }

  const Node = ({ id }: { id: string }) => {
    const step = STEP_BY_ID[id]
    if (!step) return null
    const hex = COLOR_HEX[step.color] ?? '#3b82f6'
    return (
      <button
        onClick={() => focusStage(step)}
        className="group w-full text-left rounded-xl border bg-white px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md"
        style={{ borderColor: `${hex}40` }}
        title={`${label(step)} → ${step.route}`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-lg"
            style={{ background: `${hex}1a` }}
          >
            {step.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{label(step)}</p>
            <p className="truncate font-mono text-[10px] text-slate-400">{step.route}</p>
          </div>
          <ChevronRight
            className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
          />
        </div>
      </button>
    )
  }

  // A phase column: header + vertically stacked nodes joined by small ↓ connectors.
  const PhaseColumn = ({ phase }: { phase: Phase }) => (
    <div className="flex flex-col">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {t(`workflow.phase.${phase.key}`)}
      </p>
      <div className="flex flex-col items-stretch gap-1.5">
        {phase.nodes.map((id, i) => (
          <div key={id}>
            <Node id={id} />
            {i < phase.nodes.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('workflow.title')}</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
          <MousePointerClick className="h-3.5 w-3.5" />
          {t('workflow.subtitle')}
        </p>
      </div>

      <div className="card space-y-4 p-6">
        {/* Band 0 — Data layer: raw → quality → etl (horizontal flow) */}
        <div>
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t('workflow.phase.data')}
          </p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {BAND_DATA.nodes.map((id, i) => (
              <div key={id} className="flex w-full items-center gap-2 sm:w-56">
                <div className="flex-1">
                  <Node id={id} />
                </div>
                {i < BAND_DATA.nodes.length - 1 && (
                  <ChevronRight className="hidden h-4 w-4 flex-shrink-0 text-slate-300 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fan-out connector from the ETL hub into the 4 analytics branches */}
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-slate-200" />
          <div className="h-px w-3/4 bg-slate-200" />
          <div className="-mt-px flex w-3/4 justify-around">
            {BAND_BRANCHES.map(b => <div key={b.key} className="h-4 w-px bg-slate-200" />)}
          </div>
        </div>

        {/* Band 1 — 4 analytics branches */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BAND_BRANCHES.map(phase => <PhaseColumn key={phase.key} phase={phase} />)}
        </div>

        {/* Converge connector into the outcome band */}
        <div className="flex flex-col items-center">
          <div className="-mb-px flex w-1/2 justify-around">
            {BAND_OUTCOME.map(b => <div key={b.key} className="h-4 w-px bg-slate-200" />)}
          </div>
          <div className="h-px w-1/2 bg-slate-200" />
          <div className="h-4 w-px bg-slate-200" />
        </div>

        {/* Band 2 — Governance + Insight outcomes */}
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {BAND_OUTCOME.map(phase => <PhaseColumn key={phase.key} phase={phase} />)}
        </div>
      </div>
    </div>
  )
}
