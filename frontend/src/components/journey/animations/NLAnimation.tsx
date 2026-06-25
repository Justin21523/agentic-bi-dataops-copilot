import { useEffect, useState } from 'react'

const QUESTION = '哪些客戶上個月消費超過 $1000？'
const SQL_LINES = [
  'SELECT c.name,',
  '  ROUND(SUM(p.amount), 2) AS total',
  'FROM customers c',
  'JOIN payments p',
  '  ON c.customer_id = p.customer_id',
  "WHERE p.paid_at >= date_trunc('month', now())",
  'HAVING SUM(p.amount) > 1000',
]

export default function NLAnimation() {
  const [chars, setChars] = useState(0)
  const [sqlLines, setSqlLines] = useState(0)
  const [showSql, setShowSql] = useState(false)

  useEffect(() => {
    setChars(0)
    setSqlLines(0)
    setShowSql(false)

    let i = 0
    const typing = setInterval(() => {
      i++
      setChars(i)
      if (i >= QUESTION.length) {
        clearInterval(typing)
        setTimeout(() => {
          setShowSql(true)
          let l = 0
          const sqlTimer = setInterval(() => {
            l++
            setSqlLines(l)
            if (l >= SQL_LINES.length) clearInterval(sqlTimer)
          }, 220)
        }, 400)
      }
    }, 55)
    return () => clearInterval(typing)
  }, [])

  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
      {/* Chat bubble */}
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-purple-700 flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">U</div>
        <div className="bg-purple-900/60 border border-purple-700 rounded-2xl rounded-tl-sm px-3 py-2 flex-1">
          <p className="text-xs text-purple-100 leading-relaxed">
            {QUESTION.slice(0, chars)}
            {chars < QUESTION.length && <span className="inline-block w-0.5 h-3 bg-purple-300 ml-0.5 animate-pulse" />}
          </p>
        </div>
      </div>

      {/* SQL output */}
      {showSql && sqlLines > 0 && (
        <div className="flex-1 bg-slate-800 rounded-xl p-2.5 overflow-hidden border border-slate-700"
          style={{ animation: 'fadeInUp 0.3s ease' }}>
          <p className="text-[9px] text-blue-400 font-mono uppercase tracking-wide mb-1.5">Generated SQL</p>
          <div className="font-mono text-[9px] leading-[1.5]">
            {SQL_LINES.slice(0, sqlLines).map((line, i) => (
              <div key={i} className="text-emerald-300" style={{ animation: 'fadeInUp 0.15s ease both' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
