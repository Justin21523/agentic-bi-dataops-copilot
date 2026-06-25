import { useEffect, useState } from 'react'
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'

const CHECKS = [
  'No forbidden keywords (DROP, INSERT…)',
  'Whitelisted tables only',
  'Single SELECT statement',
  'No comment injection',
]

export default function GuardrailAnimation() {
  const [checks, setChecks] = useState(0)
  const [gaugeKey, setGaugeKey] = useState(0)

  useEffect(() => {
    setChecks(0)
    setGaugeKey(k => k + 1)
    let i = 0
    const timer = setInterval(() => {
      i++
      setChecks(i)
      if (i >= CHECKS.length) clearInterval(timer)
    }, 650)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex items-center gap-3 overflow-hidden">
      {/* Gauge */}
      <div className="relative w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            key={gaugeKey}
            innerRadius="60%"
            outerRadius="90%"
            data={[{ value: 92, fill: '#10b981' }]}
            startAngle={210}
            endAngle={-30}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              angleAxisId={0}
              background={{ fill: '#1e293b' }}
              cornerRadius={6}
              isAnimationActive
              animationDuration={1200}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold text-emerald-400">92%</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Safe Rate</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex-1 space-y-2">
        {CHECKS.map((check, i) => (
          <div
            key={i}
            className="flex items-start gap-1.5 text-[10px] transition-all duration-300"
            style={{
              opacity: i < checks ? 1 : 0.1,
              transform: i < checks ? 'none' : 'translateX(-4px)',
              color: i < checks ? '#10b981' : '#475569',
            }}
          >
            <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
            <span className="leading-tight">{check}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
