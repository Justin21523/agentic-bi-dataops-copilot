import { useEffect, useState } from 'react'

const SQL = [
  'SELECT c.name,',
  '  ROUND(SUM(p.amount), 2) AS total',
  'FROM customers c',
  'JOIN payments p ON c.customer_id = p.customer_id',
  "GROUP BY c.name ORDER BY total DESC LIMIT 5",
]

const ROWS = [
  { name: 'Wang Wei',  total: '$4,832' },
  { name: 'Li Mei',   total: '$3,291' },
  { name: 'Chen Bo',  total: '$2,847' },
]

type Phase = 'sql' | 'progress' | 'rows'

export default function QueryAnimation() {
  const [phase, setPhase] = useState<Phase>('sql')
  const [progress, setProgress] = useState(0)
  const [rowCount, setRowCount] = useState(0)

  useEffect(() => {
    setPhase('sql')
    setProgress(0)
    setRowCount(0)

    const t1 = setTimeout(() => {
      setPhase('progress')
      let p = 0
      const prog = setInterval(() => {
        p += 5
        setProgress(Math.min(p, 100))
        if (p >= 100) {
          clearInterval(prog)
          setPhase('rows')
          let r = 0
          const rowTimer = setInterval(() => {
            r++
            setRowCount(r)
            if (r >= ROWS.length) clearInterval(rowTimer)
          }, 280)
        }
      }, 45)
    }, 900)

    return () => clearTimeout(t1)
  }, [])

  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
      {/* SQL */}
      <div className="bg-slate-800 rounded-lg p-2 font-mono text-[9px] leading-[1.6] border border-slate-700">
        {SQL.map((line, i) => (
          <div key={i} className="text-emerald-300">{line}</div>
        ))}
      </div>

      {/* Progress */}
      {phase !== 'sql' && (
        <div style={{ animation: 'fadeInUp 0.2s ease' }}>
          <div className="flex justify-between text-[9px] text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              {phase === 'progress' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />}
              {phase === 'rows' ? '✓ Completed' : 'DuckDB executing…'}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: phase === 'rows' ? '#10b981' : '#3b82f6',
              }}
            />
          </div>
        </div>
      )}

      {/* Result rows */}
      {phase === 'rows' && (
        <div className="space-y-1" style={{ animation: 'fadeInUp 0.2s ease' }}>
          {ROWS.slice(0, rowCount).map((r, i) => (
            <div
              key={i}
              className="flex justify-between px-2 py-1 rounded bg-slate-800 border border-slate-700"
              style={{ animation: 'fadeInUp 0.2s ease both' }}
            >
              <span className="text-[10px] text-slate-200">{r.name}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">{r.total}</span>
            </div>
          ))}
          {rowCount >= ROWS.length && (
            <p className="text-[9px] text-slate-500 text-center">{ROWS.length} rows · 12ms</p>
          )}
        </div>
      )}
    </div>
  )
}
