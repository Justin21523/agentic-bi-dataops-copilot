// 訂單轉換漏斗動畫：各狀態橫條從左展開
const STAGES = [
  { label: 'Completed', pct: 100, color: '#10b981', delay: 250 },
  { label: 'Pending',   pct:  72, color: '#3b82f6', delay: 500 },
  { label: 'Cancelled', pct:  48, color: '#f59e0b', delay: 750 },
  { label: 'Returned',  pct:  23, color: '#ef4444', delay: 1000 },
]

export default function FunnelAnimation() {
  return (
    <div style={{ background: '#0f172a', borderRadius: 10, height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
      <style>{`@keyframes barExpand { from { transform:scaleX(0); transform-origin:left } to { transform:scaleX(1); transform-origin:left } }`}</style>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>Order Conversion Funnel</div>
      {STAGES.map(({ label, pct, color, delay }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 58, fontSize: 9, color: '#94a3b8', textAlign: 'right', flexShrink: 0 }}>{label}</div>
          <div style={{ flex: 1, height: 20, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: color,
              borderRadius: 4,
              opacity: 0.85,
              animation: `barExpand 0.55s ease ${delay}ms both`,
              display: 'flex', alignItems: 'center', paddingRight: 6, justifyContent: 'flex-end',
            }}>
              <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{pct}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
