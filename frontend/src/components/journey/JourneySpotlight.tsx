import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useJourney } from '../../context/JourneyContext'
import { JOURNEY_STEPS } from '../../data/journeySteps'

const BASE: CSSProperties = {
  position: 'fixed',
  background: 'rgba(0,0,0,0.60)',
  pointerEvents: 'none',
  zIndex: 9997,
  transition: 'top 0.38s ease, left 0.38s ease, right 0.38s ease, bottom 0.38s ease, width 0.38s ease, height 0.38s ease, opacity 0.38s ease',
  opacity: 0,
}

const STEP_COLORS: Record<string, string> = {
  blue:    '#3b82f6',
  red:     '#ef4444',
  emerald: '#10b981',
  purple:  '#8b5cf6',
  indigo:  '#6366f1',
  amber:   '#f59e0b',
}

function makeCornerStyle(
  pos: 'tl' | 'tr' | 'bl' | 'br',
  rect: DOMRect,
  color: string,
): CSSProperties {
  const OFF = -10
  const SZ  = 20
  const base: CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9998,
    width: SZ,
    height: SZ,
    animation: 'scaleIn 0.3s ease both',
  }
  switch (pos) {
    case 'tl': return { ...base,
      top: rect.top + OFF,           left: rect.left + OFF,
      borderTop: `2.5px solid ${color}`, borderLeft: `2.5px solid ${color}`,
      borderRadius: '4px 0 0 0' }
    case 'tr': return { ...base,
      top: rect.top + OFF,           left: rect.right - SZ - OFF,
      borderTop: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}`,
      borderRadius: '0 4px 0 0' }
    case 'bl': return { ...base,
      top: rect.bottom - SZ - OFF,   left: rect.left + OFF,
      borderBottom: `2.5px solid ${color}`, borderLeft: `2.5px solid ${color}`,
      borderRadius: '0 0 0 4px' }
    case 'br': return { ...base,
      top: rect.bottom - SZ - OFF,   left: rect.right - SZ - OFF,
      borderBottom: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}`,
      borderRadius: '0 0 4px 0' }
  }
}

export default function JourneySpotlight() {
  const { state } = useJourney()
  const { isActive, currentStep } = state

  const topRef   = useRef<HTMLDivElement>(null)
  const botRef   = useRef<HTMLDivElement>(null)
  const leftRef  = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const lastElRef   = useRef<Element | null>(null)
  const intervalRef = useRef<number | null>(null)

  // Corner brackets rendered via React state for animation restart on step change
  const [cornerRect, setCornerRect] = useState<DOMRect | null>(null)
  const [cornerKey,  setCornerKey]  = useState(0)

  const step       = JOURNEY_STEPS[currentStep]
  const accentColor = STEP_COLORS[step?.color ?? 'blue'] ?? '#3b82f6'

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    const hide = () => {
      ;[topRef, botRef, leftRef, rightRef].forEach(r => {
        if (r.current) r.current.style.opacity = '0'
      })
      if (lastElRef.current) {
        lastElRef.current.classList.remove('journey-highlight')
        lastElRef.current = null
      }
      setCornerRect(null)
      setCornerKey(k => k + 1)
    }

    if (!isActive) { hide(); return }

    const target = step?.target
    if (!target) { hide(); return }

    // Reset corners so scaleIn restarts
    setCornerRect(null)
    setCornerKey(k => k + 1)

    const PAD = 10

    const update = () => {
      const el = document.querySelector(`[data-journey="${target}"]`)
      if (!el) return

      if (lastElRef.current && lastElRef.current !== el) {
        lastElRef.current.classList.remove('journey-highlight')
      }
      el.classList.add('journey-highlight')
      lastElRef.current = el

      const r  = el.getBoundingClientRect()
      const t  = r.top    - PAD
      const b  = r.bottom + PAD
      const l  = r.left   - PAD
      const ri = r.right  + PAD

      const set = (ref: React.RefObject<HTMLDivElement | null>, s: Partial<CSSProperties>) => {
        if (!ref.current) return
        Object.assign(ref.current.style, { opacity: '1', ...s })
      }

      set(topRef,   { top: '0', left: '0', right: '0', height: `${Math.max(0, t)}px`, bottom: 'auto', width: 'auto' })
      set(botRef,   { top: `${b}px`, left: '0', right: '0', bottom: '0', height: 'auto', width: 'auto' })
      set(leftRef,  { top: `${t}px`, left: '0', width: `${Math.max(0, l)}px`, height: `${b - t}px`, right: 'auto', bottom: 'auto' })
      set(rightRef, { top: `${t}px`, left: `${ri}px`, right: '0', height: `${b - t}px`, width: 'auto', bottom: 'auto' })

      // Update corner rect (suppress trivial jitter)
      setCornerRect(prev => {
        if (!prev) return r
        if (Math.abs(prev.top - r.top) < 1 && Math.abs(prev.left - r.left) < 1) return prev
        return r
      })
    }

    update()
    intervalRef.current = window.setInterval(update, 160)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep])

  useEffect(() => {
    return () => {
      if (lastElRef.current) lastElRef.current.classList.remove('journey-highlight')
    }
  }, [])

  return (
    <>
      <div ref={topRef}   style={{ ...BASE }} />
      <div ref={botRef}   style={{ ...BASE }} />
      <div ref={leftRef}  style={{ ...BASE }} />
      <div ref={rightRef} style={{ ...BASE }} />

      {cornerRect && isActive && (['tl', 'tr', 'bl', 'br'] as const).map(pos => (
        <div
          key={`corner-${pos}-${cornerKey}`}
          style={makeCornerStyle(pos, cornerRect, accentColor)}
        />
      ))}
    </>
  )
}
