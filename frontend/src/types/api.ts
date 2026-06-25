// ── API response types ────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string
  version: string
  db_status: string
  timestamp: string
}

export interface TableSummary {
  name: string
  description: string
  row_count_approx: number | null
  column_count: number
}

export interface ColumnInfo {
  name: string
  dtype: string
  description: string
  semantic_tags: string[]
  sample_values: (string | number | null)[]
  nullable: boolean
}

export interface TableRelationship {
  column: string
  references: string
  type: string
}

export interface TableSchemaResponse {
  name: string
  description: string
  primary_key: string
  row_count_approx: number | null
  columns: ColumnInfo[]
  relationships: TableRelationship[]
}

export interface ChartRecommendation {
  chart_type: string
  x_col: string | null
  y_col: string | null
  y_cols: string[] | null
  color_col: string | null
  config: Record<string, unknown>
  reasoning: string
}

export interface NLQueryResponse {
  question: string
  sql: string
  is_safe: boolean
  safety_issues: string[]
  columns: string[]
  rows: (string | number | null)[][]
  row_count: number
  execution_time_ms: number | null
  chart_recommendation: ChartRecommendation | null
  error: string | null
  adapter: string
}

export interface SQLValidateResponse {
  sql: string
  is_safe: boolean
  risk_level: string
  issues: string[]
  details: Record<string, unknown>
}

export interface SQLExecuteResponse {
  sql: string
  columns: string[]
  rows: (string | number | null)[][]
  row_count: number
  execution_time_ms: number | null
  error: string | null
  is_safe: boolean
}

export interface QueryHistoryItem {
  id: number
  timestamp: string
  question: string | null
  sql: string
  row_count: number | null
  execution_time_ms: number | null
  is_safe: boolean
  error_message: string | null
}

export interface QueryHistoryResponse {
  items: QueryHistoryItem[]
  total: number
}

export interface DQColumnReport {
  column_name: string
  dtype: string
  null_count: number
  null_pct: number
  distinct_count: number
  min_val: string | null
  max_val: string | null
}

export interface DQTableReport {
  table_name: string
  row_count: number
  columns: DQColumnReport[]
}

export interface DQReport {
  tables: DQTableReport[]
  generated_at: string
}

export interface ColumnSchema {
  name: string
  dtype: string
}

export interface ChartRecommendRequest {
  columns: ColumnSchema[]
  row_count: number
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface DataFreshnessResponse {
  tables: Record<string, string | null>
  generated_at: string
}

export interface FewShotAddResponse {
  success: boolean
  total_examples: number
  message: string
}

export interface PinnedQuery {
  id: string
  question: string
  sql: string
  chart_recommendation: ChartRecommendation | null
  pinned_at: string
  row_count: number
}
