export type ActorKind = 'badge' | 'scan-line' | 'ripple' | 'particle-stream'

export type AnchorPoint =
  | 'top-left' | 'top-center' | 'top-right'
  | 'left-center' | 'right-center'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export type ActorColor = 'blue' | 'emerald' | 'red' | 'amber' | 'purple' | 'indigo' | 'slate'
export type StreamDir = 'right' | 'left' | 'up'
export type AnimationType = 'fadeInUp' | 'scaleIn' | 'bounceInLeft'

export interface OverlayActor {
  id: string
  kind: ActorKind
  anchor: AnchorPoint
  dx: number          // px offset X from anchor
  dy: number          // px offset Y from anchor (positive = down)
  // Badge
  emoji?: string
  text?: string
  color?: ActorColor
  // Animation
  delay: number       // ms before appearing
  animation?: AnimationType
  fadeAfter?: number  // ms after delay before fading out
  // Particle stream
  streamDir?: StreamDir
  // Scan / ripple accent color override (hex)
  lineColor?: string
}

// Per-step actors keyed by animationType (from journeySteps.ts)
export const OVERLAY_ACTORS: Record<string, OverlayActor[]> = {

  'raw-data': [
    { id: 'ripple',   kind: 'ripple',  anchor: 'top-center',   dx: 0,    dy: 0,    delay: 350, color: 'blue' },
    { id: 'schema',   kind: 'badge',   anchor: 'top-center',   dx: 0,    dy: -40,
      emoji: '📊', text: 'Star Schema', color: 'blue',  delay: 620, animation: 'scaleIn' },
    { id: 'count',    kind: 'badge',   anchor: 'top-right',    dx: 14,   dy: -36,
      emoji: '🗄️', text: '6 Tables',   color: 'blue',  delay: 900, animation: 'fadeInUp' },
    { id: 'varchar',  kind: 'badge',   anchor: 'right-center', dx: 14,   dy: -60,
      text: 'VARCHAR',   color: 'slate', delay: 1100, animation: 'fadeInUp' },
    { id: 'integer',  kind: 'badge',   anchor: 'right-center', dx: 14,   dy: -10,
      text: 'INTEGER',   color: 'slate', delay: 1350, animation: 'fadeInUp' },
    { id: 'timestamp',kind: 'badge',   anchor: 'right-center', dx: 14,   dy: 40,
      text: 'TIMESTAMP', color: 'slate', delay: 1600, animation: 'fadeInUp' },
  ],

  'quality': [
    { id: 'scan',     kind: 'scan-line', anchor: 'top-left',   dx: 0,   dy: 0,    delay: 400, lineColor: '#3b82f6' },
    { id: 'nulls',    kind: 'badge',     anchor: 'top-left',   dx: -10, dy: -40,
      emoji: '⚠️', text: '45 Nulls Found',  color: 'red',    delay: 820,  animation: 'bounceInLeft', fadeAfter: 2100 },
    { id: 'cleaned',  kind: 'badge',     anchor: 'top-right',  dx: 14,  dy: -40,
      emoji: '✓',  text: 'Data Cleaned',    color: 'emerald', delay: 2800, animation: 'scaleIn' },
    { id: 'particles',kind: 'particle-stream', anchor: 'right-center', dx: 0, dy: 0,
      delay: 600, color: 'red', streamDir: 'left' },
  ],

  'etl-flow': [
    { id: 'ripple',   kind: 'ripple',         anchor: 'top-center',   dx: 0,  dy: 0,  delay: 500, color: 'emerald' },
    { id: 'particles',kind: 'particle-stream', anchor: 'left-center', dx: -14, dy: 0,
      delay: 350, color: 'emerald', streamDir: 'right' },
    { id: 'etl',      kind: 'badge',   anchor: 'top-right',    dx: 14, dy: -40,
      emoji: '🏭', text: 'ETL Complete',       color: 'emerald', delay: 1000, animation: 'scaleIn' },
    { id: 'rows',     kind: 'badge',   anchor: 'bottom-center',dx: 0,  dy: 20,
      emoji: '✓',  text: '+24,186 rows loaded',color: 'emerald', delay: 1600, animation: 'fadeInUp' },
  ],

  'nl-query': [
    { id: 'kw1',   kind: 'badge', anchor: 'top-left', dx: 55,  dy: 50,
      text: '客戶',  color: 'purple', delay: 700,  animation: 'scaleIn' },
    { id: 'kw2',   kind: 'badge', anchor: 'top-left', dx: 130, dy: 50,
      text: '消費',  color: 'purple', delay: 950,  animation: 'scaleIn' },
    { id: 'kw3',   kind: 'badge', anchor: 'top-left', dx: 210, dy: 50,
      text: '$1000', color: 'purple', delay: 1200, animation: 'scaleIn' },
    { id: 'arrow', kind: 'badge', anchor: 'right-center', dx: 14, dy: -14,
      emoji: '💬', text: '→ SQL', color: 'indigo', delay: 1600, animation: 'fadeInUp' },
    { id: 'ai',    kind: 'badge', anchor: 'top-right', dx: 14, dy: -40,
      emoji: '🤖', text: 'AI ✓',  color: 'purple', delay: 2000, animation: 'scaleIn' },
  ],

  'guardrail': [
    { id: 'blocked',  kind: 'badge',  anchor: 'left-center',   dx: -140, dy: -14,
      emoji: '❌', text: 'BLOCKED', color: 'red',    delay: 600,  animation: 'bounceInLeft', fadeAfter: 1500 },
    { id: 'ripple',   kind: 'ripple', anchor: 'top-center',    dx: 0,    dy: 0,     delay: 900, color: 'emerald' },
    { id: 'safe',     kind: 'badge',  anchor: 'top-right',     dx: 14,   dy: -40,
      emoji: '✓',  text: '92% Safe',          color: 'emerald', delay: 1300, animation: 'scaleIn' },
    { id: 'guard',    kind: 'badge',  anchor: 'bottom-center', dx: 0,    dy: 20,
      emoji: '🛡️', text: 'Triple-Layer Guard', color: 'blue',    delay: 1700, animation: 'fadeInUp' },
  ],

  'query-exec': [
    { id: 'scan',    kind: 'scan-line', anchor: 'top-left', dx: 0, dy: 0, delay: 400, lineColor: '#6366f1' },
    { id: 'select',  kind: 'badge', anchor: 'top-left', dx: 16, dy: 32,
      text: 'SELECT', color: 'indigo', delay: 620,  animation: 'fadeInUp' },
    { id: 'from',    kind: 'badge', anchor: 'top-left', dx: 16, dy: 60,
      text: 'FROM',   color: 'blue',   delay: 870,  animation: 'fadeInUp' },
    { id: 'where',   kind: 'badge', anchor: 'top-left', dx: 16, dy: 88,
      text: 'WHERE',  color: 'blue',   delay: 1120, animation: 'fadeInUp' },
    { id: 'speed',   kind: 'badge', anchor: 'top-right',    dx: 14, dy: -40,
      emoji: '⚡', text: '12ms',    color: 'indigo', delay: 1500, animation: 'scaleIn' },
    { id: 'rows',    kind: 'badge', anchor: 'bottom-right', dx: 14, dy: 20,
      emoji: '✓',  text: '5 rows', color: 'emerald', delay: 1800, animation: 'fadeInUp' },
  ],

  'chart-build': [
    { id: 'particles', kind: 'particle-stream', anchor: 'bottom-center', dx: 0, dy: -8,
      delay: 500, color: 'emerald', streamDir: 'up' },
    { id: 'trend',    kind: 'badge', anchor: 'top-right', dx: 14,  dy: -40,
      emoji: '📈', text: '+23% ↑', color: 'emerald', delay: 750, animation: 'scaleIn' },
    { id: 'type',     kind: 'badge', anchor: 'top-left',  dx: -14, dy: -40,
      emoji: '📊', text: 'LineChart', color: 'blue',    delay: 1050, animation: 'fadeInUp' },
    { id: 'peak',     kind: 'badge', anchor: 'top-right', dx: -16, dy: 40,
      text: '$18k peak', color: 'emerald', delay: 1350, animation: 'scaleIn' },
  ],

  'insight': [
    { id: 'ripple',  kind: 'ripple', anchor: 'top-center',    dx: 0, dy: 0,  delay: 350, color: 'amber' },
    { id: 'auto',    kind: 'badge',  anchor: 'top-center',    dx: 0, dy: -40,
      emoji: '💡', text: 'Auto-Generated',   color: 'amber', delay: 700,  animation: 'scaleIn' },
    { id: 'count',   kind: 'badge',  anchor: 'top-right',     dx: 14, dy: -40,
      text: '6 Insights',              color: 'amber', delay: 1000, animation: 'fadeInUp' },
    { id: 'drill',   kind: 'badge',  anchor: 'bottom-center', dx: 0,  dy: 20,
      emoji: '🔍', text: 'Click → SQL Drill', color: 'indigo', delay: 1450, animation: 'fadeInUp' },
  ],

  'rfm-chart': [
    { id: 'ripple',     kind: 'ripple',          anchor: 'top-center',   dx: 0,   dy: 0,    delay: 350, color: 'blue' },
    { id: 'label',      kind: 'badge',            anchor: 'top-center',   dx: 0,   dy: -40,
      emoji: '👥', text: 'RFM 分析',    color: 'blue',    delay: 600,  animation: 'scaleIn' },
    { id: 'champions',  kind: 'badge',            anchor: 'top-right',    dx: 14,  dy: -40,
      emoji: '⭐', text: 'Champions',   color: 'emerald', delay: 900,  animation: 'fadeInUp' },
    { id: 'atrisk',     kind: 'badge',            anchor: 'left-center',  dx: -130, dy: -14,
      emoji: '⚠️', text: 'At Risk',    color: 'red',     delay: 1150, animation: 'bounceInLeft' },
    { id: 'particles',  kind: 'particle-stream',  anchor: 'right-center', dx: 0,   dy: 0,    delay: 500, color: 'blue', streamDir: 'left' },
  ],

  'segment-pie': [
    { id: 'scan',      kind: 'scan-line', anchor: 'top-left',   dx: 0,  dy: 0,   delay: 400, lineColor: '#8b5cf6' },
    { id: 'label',     kind: 'badge',     anchor: 'top-center', dx: 0,  dy: -40,
      emoji: '🎯', text: '客戶分群', color: 'purple', delay: 650, animation: 'scaleIn' },
    { id: 'b2c',       kind: 'badge',     anchor: 'top-right',  dx: 14, dy: -40,
      text: 'B2C 42%',    color: 'blue',    delay: 950,  animation: 'fadeInUp' },
    { id: 'b2b',       kind: 'badge',     anchor: 'top-right',  dx: 14, dy: -8,
      text: 'B2B 35%',    color: 'emerald', delay: 1150, animation: 'fadeInUp' },
    { id: 'ripple',    kind: 'ripple',    anchor: 'top-center', dx: 0,  dy: 0,   delay: 1400, color: 'purple' },
  ],

  'ltv-bars': [
    { id: 'particles', kind: 'particle-stream', anchor: 'bottom-center', dx: 0, dy: -8, delay: 400, color: 'emerald', streamDir: 'up' },
    { id: 'label',     kind: 'badge',  anchor: 'top-center', dx: 0,  dy: -40,
      emoji: '💎', text: 'LTV 分布',         color: 'emerald', delay: 700,  animation: 'scaleIn' },
    { id: 'topltv',    kind: 'badge',  anchor: 'top-right',  dx: 14, dy: -40,
      text: 'Top 10% → $4,832', color: 'emerald', delay: 1000, animation: 'fadeInUp' },
    { id: 'ripple',    kind: 'ripple', anchor: 'top-center', dx: 0,  dy: 0,    delay: 1300, color: 'emerald' },
  ],

  'bcg-matrix': [
    { id: 'scan',   kind: 'scan-line', anchor: 'top-left',      dx: 0,    dy: 0,    delay: 350, lineColor: '#6366f1' },
    { id: 'label',  kind: 'badge',     anchor: 'top-center',    dx: 0,    dy: -40,
      emoji: '📦', text: 'BCG Matrix', color: 'indigo', delay: 600, animation: 'scaleIn' },
    { id: 'stars',  kind: 'badge',     anchor: 'top-right',     dx: 14,   dy: -40,
      emoji: '⭐', text: 'Stars',     color: 'emerald', delay: 900,  animation: 'fadeInUp' },
    { id: 'dogs',   kind: 'badge',     anchor: 'bottom-left',   dx: -10,  dy: 20,
      emoji: '🐕', text: 'Dogs',      color: 'red',     delay: 1100, animation: 'bounceInLeft' },
    { id: 'ripple', kind: 'ripple',    anchor: 'top-center',    dx: 0,    dy: 0,    delay: 1400, color: 'indigo' },
  ],

  'discount': [
    { id: 'particles', kind: 'particle-stream', anchor: 'bottom-center', dx: 0, dy: -8, delay: 400, color: 'amber', streamDir: 'up' },
    { id: 'label',     kind: 'badge', anchor: 'top-center',    dx: 0,  dy: -40,
      emoji: '💰', text: '折扣 vs 毛利', color: 'amber', delay: 650, animation: 'scaleIn' },
    { id: 'trend',     kind: 'badge', anchor: 'top-right',     dx: 14, dy: -40,
      emoji: '📉', text: 'Trendline',   color: 'red',   delay: 950, animation: 'fadeInUp' },
    { id: 'r2',        kind: 'badge', anchor: 'bottom-right',  dx: 14, dy: 20,
      text: 'R²=0.73',                  color: 'amber', delay: 1200, animation: 'fadeInUp' },
  ],

  'funnel-vis': [
    { id: 'ripple',     kind: 'ripple',         anchor: 'top-center',    dx: 0,  dy: 0,   delay: 350, color: 'blue' },
    { id: 'label',      kind: 'badge',           anchor: 'top-center',    dx: 0,  dy: -40,
      emoji: '🎯', text: '轉換漏斗',   color: 'blue',    delay: 600,  animation: 'scaleIn' },
    { id: 'top',        kind: 'badge',           anchor: 'top-left',      dx: -10, dy: 10,
      text: '100% Start',              color: 'emerald', delay: 900,  animation: 'bounceInLeft' },
    { id: 'bottom',     kind: 'badge',           anchor: 'bottom-center', dx: 0,  dy: 20,
      text: '23% Completed',           color: 'blue',    delay: 1200, animation: 'fadeInUp' },
    { id: 'particles',  kind: 'particle-stream', anchor: 'right-center',  dx: 14, dy: 0,  delay: 700, color: 'blue', streamDir: 'left' },
  ],

  'cohort-heat': [
    { id: 'scan',       kind: 'scan-line', anchor: 'top-left',   dx: 0,  dy: 0,    delay: 400, lineColor: '#8b5cf6' },
    { id: 'label',      kind: 'badge',     anchor: 'top-center', dx: 0,  dy: -40,
      emoji: '📅', text: '世代留存',       color: 'purple', delay: 700,  animation: 'scaleIn' },
    { id: 'retention',  kind: 'badge',     anchor: 'top-right',  dx: 14, dy: -40,
      text: 'D7 Ret. 45%',              color: 'purple', delay: 1000, animation: 'fadeInUp' },
    { id: 'ripple',     kind: 'ripple',    anchor: 'top-center', dx: 0,  dy: 0,    delay: 1300, color: 'purple' },
  ],

  'safety-trend': [
    { id: 'particles',  kind: 'particle-stream', anchor: 'bottom-center', dx: 0,  dy: -8, delay: 400, color: 'emerald', streamDir: 'up' },
    { id: 'ripple',     kind: 'ripple',          anchor: 'top-center',    dx: 0,  dy: 0,  delay: 700, color: 'emerald' },
    { id: 'label',      kind: 'badge',           anchor: 'top-center',    dx: 0,  dy: -40,
      emoji: '📈', text: '30-day Trend',  color: 'emerald', delay: 950,  animation: 'scaleIn' },
    { id: 'saferate',   kind: 'badge',           anchor: 'top-right',     dx: 14, dy: -40,
      emoji: '✓',  text: '92% Safe',      color: 'emerald', delay: 1200, animation: 'fadeInUp' },
  ],

  'history-list': [
    { id: 'scan',    kind: 'scan-line', anchor: 'top-left',   dx: 0,   dy: 0,    delay: 350, lineColor: '#6366f1' },
    { id: 'label',   kind: 'badge',     anchor: 'top-center', dx: 0,   dy: -40,
      emoji: '📋', text: '查詢歷史',       color: 'indigo', delay: 600,  animation: 'scaleIn' },
    { id: 'total',   kind: 'badge',     anchor: 'top-right',  dx: 14,  dy: -40,
      text: '127 queries',              color: 'indigo', delay: 900,  animation: 'fadeInUp' },
    { id: 'safe',    kind: 'badge',     anchor: 'top-left',   dx: -10, dy: -40,
      emoji: '✓',  text: '98% Safe',    color: 'emerald', delay: 1150, animation: 'bounceInLeft' },
    { id: 'ripple',  kind: 'ripple',    anchor: 'top-center', dx: 0,   dy: 0,    delay: 1400, color: 'indigo' },
  ],
}
