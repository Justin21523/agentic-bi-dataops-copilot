import { useEffect, useState } from 'react'

const COLS = [
  { name: 'age',     initial: 32, cleaned: 0 },
  { name: 'email',   initial: 18, cleaned: 0 },
  { name: 'phone',   initial: 45, cleaned: 2 },
  { name: 'address', initial: 8,  cleaned: 0 },
]

function pct2color(p: number) {
  if (p > 25) return '#ef4444'
  if (p > 8) return '#f59e0b'
  if (p > 0) return '#fbbf24'
  return '#10b981'
}

type Phase = 'dirty' | 'cleaning' | 'clean'

export default function QualityAnimation() {
  const [phase, setPhase] = useState<Phase>('dirty')

  useEffect(() => {
    setPhase('dirty')
    const t1 = setTimeout(() => setPhase('cleaning'), 1400)
    const t2 = setTimeout(() => setPhase('clean'), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const values = COLS.map(c => {
    if (phase === 'clean') return c.cleaned
    if (phase === 'cleaning') return Math.round(c.initial * 0.3)
    return c.initial
  })

  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Null % Profile</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-all duration-500 ${
          phase === 'clean'    ? 'bg-emerald-900/50 text-emerald-400' :
          phase === 'cleaning' ? 'bg-amber-900/50 text-amber-400'    :
                                 'bg-red-900/50 text-red-400'
        }`}>
          {phase === 'clean' ? '✓ Clean' : phase === 'cleaning' ? '⟳ Cleaning…' : '⚠ Issues Found'}
        </span>
      </div>

      {COLS.map((col, i) => {
        const v = values[i]
        return (
          <div key={col.name} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 w-14 flex-shrink-0">{col.name}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-1000 ease-out"
                style={{ width: `${v}%`, background: pct2color(v) }}
              />
            </div>
            <span
              className="text-[10px] font-mono w-7 text-right transition-colors duration-500"
              style={{ color: pct2color(v) }}
            >{v}%</span>
          </div>
        )
      })}

      {phase === 'clean' && (
        <div className="text-center text-[10px] text-emerald-400 font-semibold mt-auto"
          style={{ animation: 'fadeInUp 0.4s ease both' }}>
          ✓ 資料品質驗證通過
        </div>
      )}
    </div>
  )
}
