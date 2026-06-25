import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { getDataFreshness } from '../api/client'

interface Props {
  tables?: string[]  // which tables to show; empty = show latest across all
  className?: string
}

export default function DataFreshness({ tables, className = '' }: Props) {
  const [latestDate, setLatestDate] = useState<string | null>(null)

  useEffect(() => {
    getDataFreshness()
      .then(res => {
        const values = Object.entries(res.tables)
          .filter(([tname]) => !tables || tables.includes(tname))
          .map(([, v]) => v)
          .filter(Boolean) as string[]
        if (values.length > 0) {
          // Pick the most recent date string
          const sorted = values.sort().reverse()
          setLatestDate(sorted[0])
        }
      })
      .catch(() => { /* silent */ })
  }, [])

  if (!latestDate) return null

  const dateStr = latestDate.slice(0, 10)

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] text-slate-400 ${className}`}>
      <Clock className="w-3 h-3" />
      資料更新至 {dateStr}
    </span>
  )
}
