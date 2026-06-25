import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ChartRecommendation } from '../types/api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

interface Props {
  recommendation: ChartRecommendation
  columns: string[]
  rows: (string | number | null)[][]
}

function formatRows(columns: string[], rows: (string | number | null)[][]) {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  )
}

function fmtTip(v: number | string): string {
  if (typeof v === 'number') return v >= 1000 ? v.toLocaleString() : String(v)
  return String(v)
}

export default function ChartRenderer({ recommendation, columns, rows }: Props) {
  const { chart_type, x_col, y_col, y_cols, reasoning } = recommendation
  const data = formatRows(columns, rows)

  const axisStyle = { fontSize: 11, fill: '#94a3b8' }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        {chart_type === 'line' && x_col && y_col ? (
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={x_col} tick={axisStyle} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={axisStyle} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip formatter={(v: number | string) => [fmtTip(v), y_col!]} />
            <Line type="monotone" dataKey={y_col} stroke="#3b82f6" strokeWidth={2}
                  dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        ) : chart_type === 'multi_line' && x_col && y_cols ? (
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={x_col} tick={axisStyle} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={axisStyle} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {y_cols.map((col, i) => (
              <Line key={col} type="monotone" dataKey={col}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
            ))}
          </LineChart>
        ) : chart_type === 'bar' && x_col && y_col ? (
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={axisStyle}
                   tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <YAxis type="category" dataKey={y_col} tick={axisStyle} width={75} />
            <Tooltip formatter={(v: number | string) => [fmtTip(v), x_col!]} />
            <Bar dataKey={x_col} radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : chart_type === 'histogram' && x_col ? (
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={x_col} tick={axisStyle} />
            <YAxis tick={axisStyle} />
            <Tooltip />
            <Bar dataKey={x_col} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <BarChart data={data.slice(0, 20)} margin={{ top: 5, right: 20, bottom: 40, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={columns[0]} tick={axisStyle} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={axisStyle} />
            <Tooltip />
            {columns.slice(1, 4).map((col, i) => (
              <Bar key={col} dataKey={col} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
      {reasoning && (
        <p className="text-xs text-slate-400 mt-2 text-center italic">{reasoning}</p>
      )}
    </div>
  )
}
