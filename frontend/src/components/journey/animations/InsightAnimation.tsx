const CARDS = [
  { icon: '📈', title: '最高成長品類', value: '+32% MoM', sub: 'Electronics', color: '#10b981' },
  { icon: '👤', title: '最高 LTV 客戶',  value: '$12,450',  sub: 'Wang Wei · B2B', color: '#3b82f6' },
  { icon: '⚠️', title: '庫存警示',       value: '3 項產品', sub: 'Stock < 10 units', color: '#f59e0b' },
]

export default function InsightAnimation() {
  return (
    <div className="h-full bg-slate-900 rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
      <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Auto Insights</div>
      {CARDS.map((card, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-xl"
          style={{ animation: `scaleIn 0.35s ease ${i * 270}ms both` }}
        >
          <span className="text-xl flex-shrink-0">{card.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-slate-500 uppercase tracking-wide">{card.title}</p>
            <p className="text-xs font-bold truncate" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[9px] text-slate-500">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
