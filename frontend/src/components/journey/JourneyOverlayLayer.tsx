import { useEffect, useState, useRef, type CSSProperties } from 'react'
import { useJourney } from '../../context/JourneyContext'
import { JOURNEY_STEPS } from '../../data/journeySteps'
import { OVERLAY_ACTORS, type OverlayActor, type AnchorPoint } from '../../data/overlayActors'

// ── Color palette ────────────────────────────────────────────────────────────
const C: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  emerald: { bg: '#f0fdf4', text: '#059669', border: '#a7f3d0' },
  red:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  amber:   { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  purple:  { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  indigo:  { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  slate:   { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
}

const ANIM_DUR: Record<string, string> = {
  fadeInUp:     '0.4s',
  scaleIn:      '0.35s',
  bounceInLeft: '0.55s',
}

// ── Position helpers ─────────────────────────────────────────────────────────
function anchorCoords(
  anchor: AnchorPoint,
  dx: number,
  dy: number,
  rect: DOMRect,
): { top: number; left: number; center?: 'x' | 'y' } {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  switch (anchor) {
    case 'top-left':      return { top: rect.top + dy,    left: rect.left + dx }
    case 'top-center':    return { top: rect.top + dy,    left: cx + dx,    center: 'x' }
    case 'top-right':     return { top: rect.top + dy,    left: rect.right + dx }
    case 'left-center':   return { top: cy + dy,           left: rect.left + dx }
    case 'right-center':  return { top: cy + dy,           left: rect.right + dx }
    case 'bottom-left':   return { top: rect.bottom + dy, left: rect.left + dx }
    case 'bottom-center': return { top: rect.bottom + dy, left: cx + dx,    center: 'x' }
    case 'bottom-right':  return { top: rect.bottom + dy, left: rect.right + dx }
  }
}

// ── Badge ────────────────────────────────────────────────────────────────────
function BadgeActor({ a, rect, sk }: { a: OverlayActor; rect: DOMRect; sk: number }) {
  const { top, left, center } = anchorCoords(a.anchor, a.dx, a.dy, rect)
  const cs = C[a.color ?? 'blue']
  const animName = a.animation ?? 'fadeInUp'
  const dur = ANIM_DUR[animName] ?? '0.4s'
  const baseAnim = `${animName} ${dur} ease ${a.delay}ms both`
  const fullAnim = a.fadeAfter
    ? `${baseAnim}, fadeOut 0.38s ease ${a.delay + a.fadeAfter}ms both`
    : baseAnim

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: cs.bg,
    color: cs.text,
    border: `1px solid ${cs.border}`,
    borderRadius: 20,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
    animation: fullAnim,
    letterSpacing: '0.01em',
  }

  if (center === 'x') {
    // Center the badge horizontally: wrap in a fixed-width flex container
    return (
      <div
        key={`${a.id}-${sk}`}
        style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9998,
          top, left: left - 140,
          width: 280,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={pillStyle}>
          {a.emoji && <span>{a.emoji}</span>}
          {a.text && <span>{a.text}</span>}
        </div>
      </div>
    )
  }

  return (
    <div
      key={`${a.id}-${sk}`}
      style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9998, top, left }}
    >
      <div style={pillStyle}>
        {a.emoji && <span>{a.emoji}</span>}
        {a.text && <span>{a.text}</span>}
      </div>
    </div>
  )
}

// ── Scan-line ─────────────────────────────────────────────────────────────────
function ScanLineActor({ a, rect, sk }: { a: OverlayActor; rect: DOMRect; sk: number }) {
  const color = a.lineColor ?? '#3b82f6'
  const style = {
    position: 'fixed' as const,
    pointerEvents: 'none' as const,
    zIndex: 9998,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: 3,
    borderRadius: 2,
    background: `linear-gradient(90deg, transparent, ${color}60, ${color}, ${color}60, transparent)`,
    boxShadow: `0 0 8px ${color}80`,
    animationName: 'scanMove',
    animationDuration: '2.6s',
    animationDelay: `${a.delay}ms`,
    animationFillMode: 'both',
    animationTimingFunction: 'linear',
    '--scan-dist': `${rect.height}px`,
  } as CSSProperties

  return <div key={`${a.id}-${sk}`} style={style} />
}

// ── Ripple ────────────────────────────────────────────────────────────────────
function RippleActor({ a, rect, sk }: { a: OverlayActor; rect: DOMRect; sk: number }) {
  const color = C[a.color ?? 'blue'].text
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const r = Math.max(rect.width, rect.height) / 2 + 16

  return (
    <>
      {[0, 500].map((extra) => (
        <div
          key={`${a.id}-r${extra}-${sk}`}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9996,
            top: cy - r,
            left: cx - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            opacity: 0,
            animation: `rippleExpand 1.4s ease ${a.delay + extra}ms both`,
          }}
        />
      ))}
    </>
  )
}

// ── Particle stream ────────────────────────────────────────────────────────────
function ParticleStreamActor({ a, rect, sk }: { a: OverlayActor; rect: DOMRect; sk: number }) {
  const dir = a.streamDir ?? 'right'
  const color = C[a.color ?? 'emerald'].text
  const DOTS = 7
  const pdist = dir === 'up' ? rect.height + 40 : rect.width + 28

  return (
    <>
      {Array.from({ length: DOTS }, (_, i) => {
        const frac = i / DOTS
        let style: CSSProperties

        if (dir === 'right') {
          style = {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9998,
            top: rect.top + rect.height * (0.15 + frac * 0.7),
            left: rect.left - 12,
            width: 8, height: 8,
            borderRadius: '50%',
            background: color,
            animationName: 'particleRight',
            animationDuration: '1.7s',
            animationDelay: `${a.delay + i * 210}ms`,
            animationTimingFunction: 'ease',
            animationIterationCount: '3',
            animationFillMode: 'both',
            '--pdist': `${pdist}px`,
          } as CSSProperties
        } else if (dir === 'left') {
          style = {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9998,
            top: rect.top + rect.height * (0.15 + frac * 0.7),
            left: rect.right + 12,
            width: 8, height: 8,
            borderRadius: '50%',
            background: color,
            animationName: 'particleLeft',
            animationDuration: '1.7s',
            animationDelay: `${a.delay + i * 210}ms`,
            animationTimingFunction: 'ease',
            animationIterationCount: '3',
            animationFillMode: 'both',
            '--pdist': `${pdist}px`,
          } as CSSProperties
        } else {
          // up
          style = {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9998,
            top: rect.bottom - 8,
            left: rect.left + rect.width * (0.1 + frac * 0.8),
            width: 6, height: 6,
            borderRadius: '50%',
            background: color,
            animationName: 'particleUp',
            animationDuration: '1.9s',
            animationDelay: `${a.delay + i * 230}ms`,
            animationTimingFunction: 'ease',
            animationIterationCount: '3',
            animationFillMode: 'both',
            '--pdist': `${pdist}px`,
          } as CSSProperties
        }

        return <div key={`${a.id}-p${i}-${sk}`} style={style} />
      })}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function JourneyOverlayLayer() {
  const { state } = useJourney()
  const { isActive, currentStep } = state
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const step = JOURNEY_STEPS[currentStep]
  const actors = step ? (OVERLAY_ACTORS[step.animationType] ?? []) : []

  useEffect(() => {
    // Reset everything on step change
    setRect(null)
    setVisible(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!isActive || !step) return

    // Wait for page navigation + scroll to complete before showing actors
    timerRef.current = window.setTimeout(() => {
      setVisible(true)
      // Poll target rect to track scroll / resize
      intervalRef.current = window.setInterval(() => {
        const el = document.querySelector(`[data-journey="${step.target}"]`)
        if (el) setRect(el.getBoundingClientRect())
      }, 180)
    }, 560)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep])

  if (!isActive || !visible || !rect || actors.length === 0) return null

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
      {actors.map((a) => {
        const sk = currentStep
        switch (a.kind) {
          case 'badge':
            return <BadgeActor key={a.id} a={a} rect={rect} sk={sk} />
          case 'scan-line':
            return <ScanLineActor key={a.id} a={a} rect={rect} sk={sk} />
          case 'ripple':
            return <RippleActor key={a.id} a={a} rect={rect} sk={sk} />
          case 'particle-stream':
            return <ParticleStreamActor key={a.id} a={a} rect={rect} sk={sk} />
          default:
            return null
        }
      })}
    </div>
  )
}
