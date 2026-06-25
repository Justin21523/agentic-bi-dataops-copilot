import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|WITH|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|DATE_TRUNC|COALESCE|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|EXISTS|UNION|ALL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|VIEW|PROCEDURE|FUNCTION)\b/gi

function highlight(sql: string): string {
  const strings: string[] = []
  // protect string literals
  let protected_ = sql.replace(/'[^']*'/g, (m) => {
    strings.push(m)
    return `__STR${strings.length - 1}__`
  })
  // numbers
  protected_ = protected_.replace(/\b(\d+\.?\d*)\b/g, '<span class="sql-num">$1</span>')
  // keywords
  protected_ = protected_.replace(SQL_KEYWORDS, '<span class="sql-kw">$&</span>')
  // restore strings
  protected_ = protected_.replace(/__STR(\d+)__/g, (_, i) =>
    `<span class="sql-str">${strings[parseInt(i)]}</span>`
  )
  return protected_
}

export default function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative group">
      <div
        className="sql-block"
        dangerouslySetInnerHTML={{ __html: highlight(sql) }}
      />
      <button
        onClick={copy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity
                   p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
