import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react'
import { useJourney } from '../../context/JourneyContext'
import { useLang } from '../../context/LangContext'
import { JOURNEY_STEPS } from '../../data/journeySteps'
import StepAnimation from './StepAnimation'

const COLOR_BG: Record<string, string> = {
  blue:    'bg-blue-600',
  red:     'bg-red-500',
  emerald: 'bg-emerald-600',
  purple:  'bg-purple-600',
  indigo:  'bg-indigo-600',
  amber:   'bg-amber-500',
}
const COLOR_RING: Record<string, string> = {
  blue:    'bg-blue-600',
  red:     'bg-red-500',
  emerald: 'bg-emerald-500',
  purple:  'bg-purple-500',
  indigo:  'bg-indigo-500',
  amber:   'bg-amber-500',
}

export default function JourneyPanel() {
  const { state, dispatch } = useJourney()
  const { isActive, isPlaying, currentStep, totalSteps } = state
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const playTimerRef = useRef<number | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const step = JOURNEY_STEPS[currentStep]
  const isLastStep = currentStep === totalSteps - 1
  const colorBg = COLOR_BG[step?.color] ?? 'bg-blue-600'
  const colorRing = COLOR_RING[step?.color] ?? 'bg-blue-600'

  const stepTitle = step ? (lang === 'zh' ? step.title : step.title_en) : ''
  const stepSubtitle = step ? (lang === 'zh' ? step.subtitle : step.subtitle_en) : ''
  const stepDesc = step ? (lang === 'zh' ? step.description : step.description_en) : ''

  // Navigate + scroll when step changes
  useEffect(() => {
    if (!isActive || !step) return
    if (location.pathname !== step.route) navigate(step.route)
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-journey="${step.target}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 450)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep])

  // Auto-play timer
  useEffect(() => {
    if (playTimerRef.current) clearTimeout(playTimerRef.current)

    if (!isActive || !isPlaying || !step) return

    // Restart countdown bar
    if (progressRef.current) {
      progressRef.current.style.transition = 'none'
      progressRef.current.style.width = '0%'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${step.durationSec}s linear`
          progressRef.current.style.width = '100%'
        }
      }))
    }

    playTimerRef.current = window.setTimeout(() => {
      if (isLastStep) dispatch({ type: 'TOGGLE_PLAY' })
      else dispatch({ type: 'NEXT' })
    }, step.durationSec * 1000)

    return () => { if (playTimerRef.current) clearTimeout(playTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isPlaying, currentStep])

  if (!isActive || !step) return null

  return (
    <div
      className="fixed bottom-6 right-6 w-96 rounded-2xl shadow-2xl border border-slate-200 bg-white flex flex-col overflow-hidden"
      style={{ zIndex: 9999, maxHeight: '92vh' }}
    >
      {/* Header */}
      <div className={`${colorBg} px-4 py-2.5 flex items-center justify-between flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-tight">{t('journey.header')}</span>
          <span className="bg-white/25 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: 'STOP' })}
          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors"
          title={t('journey.close')}
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>

      {/* Overall progress bar */}
      <div className="h-1 bg-slate-100 flex-shrink-0">
        <div
          className={`h-full ${colorBg} transition-all duration-300`}
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Animation */}
      <div className="p-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
        <StepAnimation type={step.animationType} stepKey={currentStep} />
      </div>

      {/* Step info */}
      <div className="px-4 py-3 flex-1 overflow-y-auto min-h-0">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{stepTitle}</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{stepSubtitle}</p>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{stepDesc}</p>
          </div>
        </div>
      </div>

      {/* Step dots */}
      <div className="px-4 py-1.5 flex items-center justify-center gap-1.5 flex-shrink-0">
        {Array.from({ length: totalSteps }, (_, i) => (
          <button
            key={i}
            onClick={() => dispatch({ type: 'GOTO', step: i })}
            title={lang === 'zh' ? JOURNEY_STEPS[i].title : JOURNEY_STEPS[i].title_en}
            className={`rounded-full transition-all duration-200 ${
              i === currentStep
                ? `w-4 h-2 ${colorRing}`
                : i < currentStep
                  ? `w-2 h-2 ${colorRing} opacity-40`
                  : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
            }`}
          />
        ))}
      </div>

      {/* Auto-play countdown bar */}
      <div className={`h-0.5 mx-4 mb-0.5 rounded overflow-hidden ${isPlaying ? 'bg-slate-100' : 'bg-transparent'}`}>
        <div ref={progressRef} className="h-full bg-slate-300 rounded" style={{ width: '0%' }} />
      </div>

      {/* Navigation */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0">
        <button
          onClick={() => dispatch({ type: 'PREV' })}
          disabled={currentStep === 0}
          className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t('journey.prev')}
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isPlaying
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : `${colorBg} text-white hover:opacity-90`
          }`}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isPlaying ? t('journey.pause') : t('journey.autoplay')}
        </button>

        {isLastStep ? (
          <button
            onClick={() => dispatch({ type: 'STOP' })}
            className="btn-primary py-1.5 px-3 text-xs"
          >
            {t('journey.done')}
          </button>
        ) : (
          <button
            onClick={() => dispatch({ type: 'NEXT' })}
            className="btn-primary py-1.5 px-3 text-xs"
          >
            {t('journey.next')}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
