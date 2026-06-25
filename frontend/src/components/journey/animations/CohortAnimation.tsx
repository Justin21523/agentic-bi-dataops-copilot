// 世代留存熱力圖動畫：格子從灰→藍依序出現
const COHORTS = ['2024-01', '2024-02', '2024-03', '2024-04']
const COLS    = ['M0', 'M1', 'M2', 'M3', 'M4']
const RETENTION = [
  [100, 45, 32, 28, 22],
  [100, 52, 38, 30, 25],
  [100, 48, 35, 27, 19],
  [100, 55, 42, 33, 28],
]

export default function CohortAnimation() {
  return (
    <div style={{ background: '#0f172a', borderRadius: 10, height: '100%', padding: '10px 12px', overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>Customer Retention Cohort</div>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 2, fontSize: 9 }}>
        <thead>
          <tr>
            <th style={{ color: '#475569', padding: '2px 4px', textAlign: 'left', fontWeight: 500, fontSize: 8 }}>Cohort</th>
            {COLS.map(c => (
              <th key={c} style={{ color: '#475569', padding: '2px 4px', textAlign: 'center', fontWeight: 500, fontSize: 8 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COHORTS.map((cohort, ri) => (
            <tr key={cohort}>
              <td style={{ color: '#64748b', padding: '2px 4px', fontWeight: 500, fontSize: 8, whiteSpace: 'nowrap' }}>{cohort}</td>
              {RETENTION[ri].map((pct, ci) => {
                const alpha = pct / 100
                return (
                  <td key={ci} style={{
                    padding: '3px 2px',
                    textAlign: 'center',
                    borderRadius: 4,
                    background: `rgba(59,130,246,${alpha * 0.75 + 0.05})`,
                    color: alpha > 0.5 ? '#fff' : '#93c5fd',
                    fontWeight: 700,
                    fontSize: 8,
                    animation: `scaleIn 0.3s ease ${280 + (ri * 5 + ci) * 90}ms both`,
                  }}>
                    {pct}%
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: 'center', fontSize: 8, color: '#334155', marginTop: 8, animation: 'fadeInUp 0.3s ease 2000ms both' }}>
        Darker blue = higher retention
      </div>
    </div>
  )
}
