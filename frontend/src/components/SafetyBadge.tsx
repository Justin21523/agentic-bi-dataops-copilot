import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'

interface Props {
  isSafe: boolean
  riskLevel?: string
  issues?: string[]
  size?: 'sm' | 'md'
}

export default function SafetyBadge({ isSafe, riskLevel, issues, size = 'md' }: Props) {
  if (isSafe) {
    return (
      <div className="flex items-center gap-2">
        <span className="badge-safe">
          <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          SAFE
        </span>
        {size === 'md' && (
          <span className="text-xs text-slate-500">All validation checks passed</span>
        )}
      </div>
    )
  }

  const isCritical = riskLevel === 'critical'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={isCritical ? 'badge-unsafe' : 'badge-warn'}>
          {isCritical
            ? <ShieldAlert className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            : <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          }
          {isCritical ? 'BLOCKED' : 'WARNING'}
        </span>
        {riskLevel && (
          <span className="text-xs text-slate-500 capitalize">{riskLevel}</span>
        )}
      </div>
      {issues && issues.length > 0 && size === 'md' && (
        <ul className="text-xs text-red-600 space-y-0.5 ml-1">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="mt-0.5">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
