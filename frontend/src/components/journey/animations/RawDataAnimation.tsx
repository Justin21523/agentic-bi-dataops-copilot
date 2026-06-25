import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'

const TABLES = [
  { name: 'customers', rows: '1,250', icon: '👤' },
  { name: 'orders', rows: '8,432', icon: '📦' },
  { name: 'products', rows: '342', icon: '🏷️' },
  { name: 'payments', rows: '8,102', icon: '💳' },
  { name: 'reviews', rows: '5,691', icon: '⭐' },
  { name: 'order_items', rows: '24,186', icon: '📋' },
]

export default function RawDataAnimation() {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    setVisible(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisible(i)
      if (i >= TABLES.length) clearInterval(interval)
    }, 350)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden">
      <div className="flex items-center gap-2 mb-0.5">
        <Database className="w-3 h-3 text-blue-400" />
        <span className="text-blue-400 text-[10px] font-mono uppercase tracking-widest">Schema Discovery</span>
      </div>
      {TABLES.map((t, i) => (
        <div
          key={t.name}
          style={{
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
          className="flex items-center justify-between px-2 py-1 rounded-md bg-slate-800 border border-slate-700"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{t.icon}</span>
            <span className="text-xs font-mono text-slate-200">{t.name}</span>
          </div>
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded">{t.rows}</span>
        </div>
      ))}
    </div>
  )
}
