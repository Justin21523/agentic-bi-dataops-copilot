export type AnimationType =
  | 'raw-data'
  | 'quality'
  | 'etl-flow'
  | 'rfm-chart'
  | 'segment-pie'
  | 'ltv-bars'
  | 'bcg-matrix'
  | 'discount'
  | 'funnel-vis'
  | 'cohort-heat'
  | 'nl-query'
  | 'guardrail'
  | 'safety-trend'
  | 'query-exec'
  | 'history-list'
  | 'chart-build'
  | 'insight'

export interface JourneyStep {
  id: string
  order: number
  icon: string
  title: string
  title_en: string
  subtitle: string
  subtitle_en: string
  description: string
  description_en: string
  route: string
  target: string
  animationType: AnimationType
  color: string
  durationSec: number
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 'raw-data', order: 1, icon: '📁',
    title: '原始資料結構', title_en: 'Raw Data Schema',
    subtitle: 'Raw Data Schema', subtitle_en: 'Star Schema · 6 Tables',
    description: '資料旅程從這裡開始。系統識別倉儲中的 6 張核心資料表，涵蓋客戶、訂單、產品、付款、評論與訂單明細，構成完整的電商星型 Schema。',
    description_en: 'The journey starts here. The system identifies 6 core tables in the warehouse: customers, orders, products, payments, reviews, and order items — forming a complete e-commerce star schema.',
    route: '/schema', target: 'schema-tables', animationType: 'raw-data', color: 'blue', durationSec: 7,
  },
  {
    id: 'quality', order: 2, icon: '🔍',
    title: '資料品質掃描', title_en: 'Data Quality Scan',
    subtitle: 'Data Quality Profiling', subtitle_en: 'Null Rate · Type · Range',
    description: 'DQ 引擎對每個欄位進行 null 率、型別、值域分析。發現問題欄位後，自動標記需清理的資料，確保後續分析的可靠性。',
    description_en: 'The DQ engine profiles each column for null rate, type, and value range. Issues are auto-flagged for cleaning to ensure downstream analysis reliability.',
    route: '/dq', target: 'dq-report', animationType: 'quality', color: 'red', durationSec: 7,
  },
  {
    id: 'etl', order: 3, icon: '🏭',
    title: 'ETL 入倉流程', title_en: 'ETL Pipeline',
    subtitle: 'DuckDB ETL Pipeline', subtitle_en: 'Vectorized · 10–100× Faster',
    description: '清洗後的資料透過 ETL 管線載入 DuckDB 分析倉儲。DuckDB 的向量化執行引擎讓 OLAP 查詢速度提升 10–100 倍，KPI 卡片即時反映入倉結果。',
    description_en: "Cleaned data is loaded into DuckDB's analytical warehouse via the ETL pipeline. DuckDB's vectorized execution delivers 10–100× faster OLAP queries; KPIs reflect the latest ingest in real time.",
    route: '/', target: 'kpi-cards', animationType: 'etl-flow', color: 'emerald', durationSec: 7,
  },
  {
    id: 'rfm', order: 4, icon: '👥',
    title: '客戶 RFM 分析', title_en: 'Customer RFM Analysis',
    subtitle: 'Customer RFM Segmentation', subtitle_en: 'Recency · Frequency · Monetary',
    description: 'RFM 模型依近度（Recency）、頻率（Frequency）、消費金額（Monetary）對客戶進行多維度評分，散點圖揭示每位客戶的行為象限，識別高價值與流失風險群體。',
    description_en: 'The RFM model scores customers on Recency, Frequency, and Monetary dimensions. The scatter chart reveals each customer\'s behavior quadrant, identifying high-value vs. at-risk groups.',
    route: '/customers', target: 'rfm-scatter', animationType: 'rfm-chart', color: 'blue', durationSec: 8,
  },
  {
    id: 'segment', order: 5, icon: '🎯',
    title: '客戶分群洞察', title_en: 'Segment Insights',
    subtitle: 'Revenue by Segment', subtitle_en: 'B2C · B2B · SMB',
    description: '圓餅圖分解各客戶分群（B2C/B2B/SMB）的收入貢獻比例。精準的分群分析是個人化行銷與定價策略的基礎，直接影響 CLV 最大化。',
    description_en: 'The pie chart breaks down revenue contribution by customer segment (B2C/B2B/SMB). Precise segmentation drives personalized marketing and pricing strategies, directly maximizing CLV.',
    route: '/customers', target: 'segment-donut', animationType: 'segment-pie', color: 'purple', durationSec: 7,
  },
  {
    id: 'ltv', order: 6, icon: '💎',
    title: '客戶終身價值', title_en: 'Customer Lifetime Value',
    subtitle: 'LTV Distribution Histogram', subtitle_en: 'Long-tail · Top Customer Effect',
    description: '長條圖呈現客戶終身價值（LTV）的分布形態——揭示長尾效應：少數頭部客戶貢獻大多數收入。這是判斷客戶獲取成本上限的關鍵指標。',
    description_en: 'The histogram shows LTV distribution — revealing the long-tail effect where a small group of top customers drives most revenue. This informs customer acquisition cost ceilings.',
    route: '/customers', target: 'ltv-histogram', animationType: 'ltv-bars', color: 'emerald', durationSec: 7,
  },
  {
    id: 'bcg', order: 7, icon: '📦',
    title: '產品 BCG 矩陣', title_en: 'BCG Product Matrix',
    subtitle: 'BCG Product Matrix', subtitle_en: 'Stars · Cash Cows · Dogs',
    description: 'BCG 矩陣以銷量（X 軸）與評分（Y 軸）定位每件產品：Stars（高銷量高評分）是核心資產，Dogs（低銷量低評分）是潛在淘汰對象，為庫存與行銷預算分配提供決策依據。',
    description_en: 'The BCG matrix positions products by units sold (X) and rating (Y). Stars are core assets; Dogs are candidates for removal. Guides inventory and marketing budget allocation.',
    route: '/products', target: 'bcg-matrix', animationType: 'bcg-matrix', color: 'indigo', durationSec: 8,
  },
  {
    id: 'discount', order: 8, icon: '💰',
    title: '折扣策略分析', title_en: 'Discount Strategy',
    subtitle: 'Discount Rate vs Gross Margin', subtitle_en: 'Regression · R² · Margin Erosion',
    description: '散點圖配合線性迴歸趨勢線，量化折扣幅度對毛利率的侵蝕效應。R² 值衡量相關強度，協助定價團隊在促銷驅動與利潤保護之間找到最優解。',
    description_en: 'Scatter chart with linear regression quantifies how discount depth erodes gross margin. The R² value measures correlation strength, helping pricing teams optimize promotions vs. profit.',
    route: '/products', target: 'discount-scatter', animationType: 'discount', color: 'amber', durationSec: 7,
  },
  {
    id: 'funnel', order: 9, icon: '🎯',
    title: '轉換漏斗分析', title_en: 'Conversion Funnel',
    subtitle: 'Order Conversion Funnel', subtitle_en: 'Drop-off · Bottleneck · Rate',
    description: '漏斗圖追蹤訂單從建立到完成的各狀態轉換率。每個階段的流失比例直接揭示流程瓶頸，是提升轉換率的優先行動清單。',
    description_en: 'The funnel tracks order status conversion rates from creation to completion. Drop-off at each stage reveals bottlenecks and prioritizes conversion improvement efforts.',
    route: '/funnel', target: 'funnel-chart', animationType: 'funnel-vis', color: 'blue', durationSec: 7,
  },
  {
    id: 'cohort', order: 10, icon: '📅',
    title: '世代留存分析', title_en: 'Retention Cohort',
    subtitle: 'Customer Retention Cohort', subtitle_en: 'Heatmap · Monthly · Stickiness',
    description: '世代熱力圖（Cohort Heatmap）追蹤每月新增客戶在後續月份的留存率，藍色越深代表留存越高。這是評估產品黏性與用戶體驗改善成效的最直接指標。',
    description_en: 'The cohort heatmap tracks monthly retention rates for each acquisition cohort — darker blue = higher retention. The most direct metric for product stickiness and UX improvement.',
    route: '/funnel', target: 'cohort-heatmap', animationType: 'cohort-heat', color: 'purple', durationSec: 8,
  },
  {
    id: 'nl-query', order: 11, icon: '💬',
    title: '自然語言轉 SQL', title_en: 'Natural Language → SQL',
    subtitle: 'Natural Language → SQL', subtitle_en: 'Schema-aware · Explainable · Auditable',
    description: '使用者用中文提問，AI Agent 解析語意、映射 Schema 欄位、生成 SQL。整個過程可解釋、可審計，不是黑箱。',
    description_en: 'Users ask in Chinese or English; the AI Agent interprets semantics, maps schema fields, and generates SQL. The entire process is explainable and auditable — not a black box.',
    route: '/query', target: 'nl-input', animationType: 'nl-query', color: 'purple', durationSec: 8,
  },
  {
    id: 'guardrail', order: 12, icon: '🛡️',
    title: 'SQL 安全驗證', title_en: 'SQL Safety Guardrail',
    subtitle: 'Triple-Layer SQL Guardrail', subtitle_en: 'Regex · AST · Whitelist',
    description: '每條 SQL 經三層驗證：① Regex 關鍵字過濾 → ② sqlparse AST 解析 → ③ 資料表白名單比對。確保只有安全的 SELECT 查詢能進入執行引擎。',
    description_en: 'Every SQL passes three validation layers: ① Regex keyword filter → ② sqlparse AST parsing → ③ table whitelist check. Only safe SELECT queries reach the execution engine.',
    route: '/guardrails', target: 'safety-gauge', animationType: 'guardrail', color: 'blue', durationSec: 7,
  },
  {
    id: 'trend', order: 13, icon: '📈',
    title: '安全趨勢追蹤', title_en: 'Safety Trend Tracking',
    subtitle: 'Daily Safety Trend', subtitle_en: 'Observability · Anomaly Detection',
    description: '面積趨勢圖記錄每日安全查詢與被阻擋查詢的消長。持續監控安全率趨勢有助於識別異常攻擊模式或模型漂移，是系統可觀測性的核心視圖。',
    description_en: 'The area trend chart records daily safe vs. blocked query volumes. Continuous monitoring helps identify anomalous attack patterns or model drift — core observability view.',
    route: '/guardrails', target: 'safety-trend', animationType: 'safety-trend', color: 'emerald', durationSec: 7,
  },
  {
    id: 'query-exec', order: 14, icon: '⚡',
    title: '查詢執行引擎', title_en: 'Query Execution Engine',
    subtitle: 'DuckDB Query Execution', subtitle_en: 'Vectorized · Real-time · Validated',
    description: '通過安全驗證的 SQL 由 DuckDB 向量化引擎執行。SQL Playground 讓使用者直接撰寫、驗證、執行 SQL，並即時看到結果與執行時間。',
    description_en: 'SQL that passes safety validation is executed by DuckDB\'s vectorized engine. The SQL Playground lets users write, validate, and execute SQL with real-time results and timing.',
    route: '/playground', target: 'sql-editor', animationType: 'query-exec', color: 'indigo', durationSec: 7,
  },
  {
    id: 'history', order: 15, icon: '📋',
    title: '查詢歷史追蹤', title_en: 'Query History',
    subtitle: 'Auditable Query History', subtitle_en: 'Full Audit Trail · Traceable',
    description: '每次查詢都被完整記錄：SQL 內容、執行時間、安全狀態、回傳筆數。完整的稽核軌跡是企業 BI 系統「可解釋性」的具體實踐——任何分析結論都能追溯來源。',
    description_en: 'Every query is fully logged: SQL, execution time, safety status, and row count. A complete audit trail is the concrete expression of enterprise BI explainability — any insight is traceable to source.',
    route: '/history', target: 'history-list', animationType: 'history-list', color: 'indigo', durationSec: 8,
  },
  {
    id: 'insight', order: 16, icon: '💡',
    title: '洞察自動發現', title_en: 'Auto Insight Discovery',
    subtitle: 'Auto-Generated Insights', subtitle_en: 'Parallel SQL · Clickable · Traceable',
    description: '系統並行執行 6 條預設分析 SQL，自動發現最高成長品類、最高 LTV 客戶、最佳產品、庫存警示等關鍵洞察，並以卡片形式呈現，點擊即可追溯 SQL 明細。',
    description_en: 'The system runs 6 analytical SQL queries in parallel, automatically surfacing fastest-growing categories, highest LTV customers, best products, and inventory alerts as clickable cards linked to SQL.',
    route: '/insights', target: 'insight-grid', animationType: 'insight', color: 'amber', durationSec: 8,
  },
]
