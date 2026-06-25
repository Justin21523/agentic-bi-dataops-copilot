// 查詢歷史記錄動畫：每行依序 fadeInUp 出現
const QUERIES = [
  { sql: "SELECT c.name, SUM(p.amount) FROM customers c ...", safe: true,  time: '12ms' },
  { sql: "SELECT product_id, COUNT(*) FROM order_items ...", safe: true,  time: '8ms'  },
  { sql: "DROP TABLE customers",                              safe: false, time: '—'    },
  { sql: "SELECT * FROM orders WHERE status='completed'",    safe: true,  time: '23ms' },
  { sql: "SELECT AVG(amount) FROM payments GROUP BY month",  safe: true,  time: '15ms' },
]

export default function HistoryAnimation() {
  return (
    <div style={{ background: '#0f172a', borderRadius: 10, height: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600 }}>Query History Log</div>
      {QUERIES.map((q, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', borderRadius: 6,
          border: '1px solid #1e293b',
          animation: `fadeInUp 0.3s ease ${200 + i * 200}ms both`,
        }}>
          <div style={{
            padding: '1px 6px', borderRadius: 8, fontSize: 8, fontWeight: 700, flexShrink: 0,
            background: q.safe ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: q.safe ? '#10b981' : '#ef4444',
          }}>
            {q.safe ? 'SAFE' : 'BLOCKED'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 8, color: '#64748b', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.sql}
            </p>
          </div>
          <span style={{ fontSize: 8, color: '#475569', flexShrink: 0 }}>{q.time}</span>
        </div>
      ))}
      <div style={{ textAlign: 'center', fontSize: 8, color: '#334155', marginTop: 2, animation: 'fadeInUp 0.3s ease 1300ms both' }}>
        Total: 127 queries · Auditable trail
      </div>
    </div>
  )
}
