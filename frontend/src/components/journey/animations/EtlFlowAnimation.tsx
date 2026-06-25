export default function EtlFlowAnimation() {
  const dotStyle = (delay: string, color: string): React.CSSProperties => ({
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    top: '50%',
    transform: 'translateY(-50%)',
    animation: `dataFlow 1.4s linear ${delay} infinite`,
  })

  return (
    <div className="h-full bg-slate-900 rounded-xl p-4 flex flex-col justify-center gap-4 overflow-hidden">
      <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest text-center">ETL Pipeline</div>

      <div className="flex items-center justify-between gap-1">
        {/* Source */}
        <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-xl">📄</div>
          <span className="text-[9px] text-slate-400 text-center leading-tight">CSV<br/>Files</span>
        </div>

        {/* Arrow 1 */}
        <div className="flex-1 relative h-5 flex items-center">
          <div className="h-0.5 w-full bg-slate-700 rounded-full" />
          {['0s', '0.45s', '0.9s'].map((d, i) => (
            <div key={i} style={dotStyle(d, '#10b981')} />
          ))}
        </div>

        {/* DuckDB */}
        <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-blue-900/60 border border-blue-700 flex items-center justify-center text-xl">⚙️</div>
          <span className="text-[9px] text-blue-400 text-center leading-tight">DuckDB<br/>Engine</span>
        </div>

        {/* Arrow 2 */}
        <div className="flex-1 relative h-5 flex items-center">
          <div className="h-0.5 w-full bg-slate-700 rounded-full" />
          {['0.2s', '0.65s', '1.1s'].map((d, i) => (
            <div key={i} style={dotStyle(d, '#3b82f6')} />
          ))}
        </div>

        {/* Warehouse */}
        <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
          <div className="w-11 h-11 rounded-xl bg-emerald-900/60 border border-emerald-700 flex items-center justify-center text-xl">🗄️</div>
          <span className="text-[9px] text-emerald-400 text-center leading-tight">OLAP<br/>Warehouse</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800">
        {[['1,250', 'customers'], ['8,432', 'orders'], ['24,186', 'items']].map(([n, l]) => (
          <div key={l} className="text-center">
            <p className="text-sm font-bold text-emerald-400">{n}</p>
            <p className="text-[9px] text-slate-500">{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
