import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
}

const COLORS = {
  blue:   'text-blue-600 bg-blue-50',
  green:  'text-emerald-600 bg-emerald-50',
  amber:  'text-amber-600 bg-amber-50',
  red:    'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50',
  slate:  'text-slate-600 bg-slate-100',
}

export default function MetricCard({ label, value, sub, icon: Icon, color = 'blue' }: Props) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <p className="metric-label">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLORS[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="metric-value mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
