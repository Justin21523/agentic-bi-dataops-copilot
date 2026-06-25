import type {
  HealthResponse,
  TableSummary,
  TableSchemaResponse,
  NLQueryResponse,
  SQLValidateResponse,
  SQLExecuteResponse,
  QueryHistoryResponse,
  DQReport,
  ChartRecommendation,
  ColumnSchema,
  ConversationMessage,
  DataFreshnessResponse,
  FewShotAddResponse,
} from '../types/api'

const BASE = '/api'

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Health ──────────────────────────────────────────────────────────────────
export const getHealth = () => request<HealthResponse>('/health')

// ── Metadata ────────────────────────────────────────────────────────────────
export const getTables = () => request<TableSummary[]>('/metadata/tables')
export const getTableSchema = (name: string) =>
  request<TableSchemaResponse>(`/metadata/tables/${name}`)

// ── Query ────────────────────────────────────────────────────────────────────
export const runNLQuery = (
  question: string,
  maxRows = 500,
  conversationHistory: ConversationMessage[] = [],
) =>
  request<NLQueryResponse>('/query/nl', {
    method: 'POST',
    body: JSON.stringify({ question, max_rows: maxRows, conversation_history: conversationHistory }),
  })

export const validateSQL = (sql: string) =>
  request<SQLValidateResponse>('/query/sql/validate', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  })

export const executeSQL = (sql: string, maxRows = 500) =>
  request<SQLExecuteResponse>('/query/sql/execute', {
    method: 'POST',
    body: JSON.stringify({ sql, max_rows: maxRows }),
  })

export const getQueryHistory = (limit = 50) =>
  request<QueryHistoryResponse>(`/query/history?limit=${limit}`)

// ── Chart ────────────────────────────────────────────────────────────────────
export const recommendChart = (columns: ColumnSchema[], rowCount: number) =>
  request<ChartRecommendation>('/chart/recommend', {
    method: 'POST',
    body: JSON.stringify({ columns, row_count: rowCount }),
  })

// ── Data Quality ─────────────────────────────────────────────────────────────
export const getDQReport = () => request<DQReport>('/dq/report')

// ── Data Freshness ────────────────────────────────────────────────────────────
export const getDataFreshness = () => request<DataFreshnessResponse>('/query/freshness')

// ── Few-shot examples ─────────────────────────────────────────────────────────
export const addFewShotExample = (question: string, sql: string, notes = '') =>
  request<FewShotAddResponse>('/query/few-shot/add', {
    method: 'POST',
    body: JSON.stringify({ question, sql, notes }),
  })
