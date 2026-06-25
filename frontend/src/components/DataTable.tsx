import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

interface Props {
  columns: string[]
  rows: (string | number | null)[][]
  maxHeight?: number
  downloadName?: string
}

function toCSV(columns: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [columns, ...rows].map((r) => r.map(escape).join(',')).join('\n')
}

export default function DataTable({ columns, rows, maxHeight = 400, downloadName = 'results' }: Props) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (i: number) => {
    if (sortCol === i) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(i); setSortDir('asc') }
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortCol === null) return 0
    const va = a[sortCol]; const vb = b[sortCol]
    if (va == null) return 1
    if (vb == null) return -1
    const cmp = typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const download = () => {
    const csv = toCSV(columns, rows)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `${downloadName}.csv`
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">{rows.length.toLocaleString()} rows · {columns.length} columns</p>
        <button onClick={download} className="btn-secondary text-xs py-1.5 px-3">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>
      <div className="table-wrapper" style={{ maxHeight }}>
        <table className="data-table">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col}
                  onClick={() => handleSort(i)}
                  className="cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    {sortCol === i
                      ? sortDir === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-30" />
                    }
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className={typeof cell === 'number' ? 'text-right font-mono' : ''}>
                    {cell == null
                      ? <span className="text-slate-300 italic">null</span>
                      : typeof cell === 'number'
                        ? cell.toLocaleString()
                        : String(cell)
                    }
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
