import { useEffect, useState } from 'react'

const POINTS = [
  { x: 15, y: 82 }, { x: 45, y: 60 }, { x: 75, y: 70 },
  { x: 105, y: 35 }, { x: 135, y: 48 }, { x: 165, y: 18 },
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const PATH = POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
const AREA = `${PATH} L 165 100 L 15 100 Z`
const PATH_LEN = 240

export default function ChartBuildAnimation() {
  const [drawn, setDrawn] = useState(false)
  const [dotIdx, setDotIdx] = useState(0)

  useEffect(() => {
    setDrawn(false)
    setDotIdx(0)
    const t1 = setTimeout(() => {
      setDrawn(true)
      let d = 0
      const dt = setInterval(() => {
        d++
        setDotIdx(d)
        if (d >= POINTS.length) clearInterval(dt)
      }, 280)
    }, 200)
    return () => clearTimeout(t1)
  }, [])

  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex flex-col overflow-hidden">
      <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-2">Monthly Revenue Trend</div>
      <div className="flex-1 relative">
        <svg width="100%" height="100%" viewBox="0 0 185 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="jAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[30, 55, 80].map(y => (
            <line key={y} x1="10" y1={y} x2="175" y2={y}
              stroke="#1e293b" strokeWidth="1" />
          ))}

          {/* Area */}
          <path
            d={AREA}
            fill="url(#jAreaGrad)"
            style={{
              opacity: drawn ? 1 : 0,
              transition: 'opacity 0.6s ease 1.2s',
            }}
          />

          {/* Line */}
          <path
            d={PATH}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: PATH_LEN,
              strokeDashoffset: drawn ? 0 : PATH_LEN,
              transition: 'stroke-dashoffset 1.4s ease',
            }}
          />

          {/* Dots */}
          {POINTS.slice(0, dotIdx).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5"
              fill="#3b82f6" stroke="#0f172a" strokeWidth="1.5"
              style={{ animation: 'scaleIn 0.2s ease' }}
            />
          ))}

          {/* X labels */}
          {MONTHS.map((m, i) => (
            <text key={m} x={POINTS[i].x} y={108} textAnchor="middle"
              fontSize="7" fill="#475569">{m}</text>
          ))}
        </svg>
      </div>
    </div>
  )
}
