// RFM 四象限散點動畫：Champions / At Risk / Potential / Dogs
const QUADS = [
  { id: 'Q1', label: 'Champions', color: '#10b981', dots: [[65, 18], [72, 24], [78, 14]] },
  { id: 'Q2', label: 'At Risk',   color: '#ef4444', dots: [[14, 20], [21, 26], [17, 15]] },
  { id: 'Q3', label: 'Potential', color: '#3b82f6', dots: [[66, 67], [73, 72], [79, 63]] },
  { id: 'Q4', label: 'Dogs',      color: '#94a3b8', dots: [[12, 66], [19, 73], [23, 68]] },
] as const

export default function RFMAnimation() {
  return (
    <div style={{ background: '#0f172a', borderRadius: 10, height: '100%', position: 'relative', overflow: 'hidden', padding: 8 }}>
      <style>{`@keyframes rfmDot { from { transform:scale(0); opacity:0 } to { transform:scale(1); opacity:0.85 } }`}</style>

      {/* Axis title */}
      <div style={{ position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: '#475569', letterSpacing: '0.05em' }}>RFM Segmentation</div>

      {/* Quadrant dividers */}
      <div style={{ position: 'absolute', top: '15%', bottom: '8%', left: '50%', width: 1, background: '#1e293b' }} />
      <div style={{ position: 'absolute', left: '8%', right: '4%', top: '50%', height: 1, background: '#1e293b' }} />

      {/* Axis labels */}
      <div style={{ position: 'absolute', bottom: 4, left: '52%', fontSize: 7, color: '#334155' }}>Days Since Order →</div>
      <div style={{ position: 'absolute', left: 3, top: '22%', fontSize: 7, color: '#334155' }}>Freq ↑</div>

      {QUADS.map(({ id, label, color, dots }, qi) => (
        <div key={id}>
          {dots.map(([x, y], di) => (
            <div key={di} style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              width: 8, height: 8, borderRadius: '50%',
              background: color,
              animation: `rfmDot 0.32s ease ${300 + qi * 360 + di * 120}ms both`,
            }} />
          ))}
          <div style={{
            position: 'absolute',
            left: (id === 'Q1' || id === 'Q3') ? '62%' : '9%',
            top: (id === 'Q1' || id === 'Q2') ? '16%' : '55%',
            fontSize: 9, color, fontWeight: 700,
            animation: `fadeInUp 0.3s ease ${300 + qi * 360 + 360}ms both`,
          }}>{label}</div>
        </div>
      ))}
    </div>
  )
}
