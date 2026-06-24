# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interface                               │
│   Streamlit (port 8501)  ←→  httpx  ←→  FastAPI (port 8000)        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │         FastAPI Layer         │
                    │  /query/nl  /query/sql/*      │
                    │  /metadata  /dq  /chart       │
                    └──────────┬──────────┬─────────┘
                               │          │
           ┌───────────────────▼──┐    ┌──▼──────────────────────┐
           │   Core Pipeline      │    │   Metadata Catalog       │
           │                      │    │   (catalog.yaml)         │
           │ 1. Schema Retriever  │    │                          │
           │ 2. Text2SQL Adapter  │    │   - table descriptions   │
           │ 3. SQL Validator     │    │   - column semantics     │
           │ 4. Query Executor    │    │   - sample values        │
           │ 5. Chart Recommender │    │   - metric dictionary    │
           └──────────┬───────────┘    └──────────────────────────┘
                      │
           ┌──────────▼───────────┐
           │    DuckDB Warehouse  │
           │  (data/warehouse.duckdb)
           │                      │
           │  orders              │
           │  order_items         │
           │  customers           │
           │  products            │
           │  payments            │
           │  reviews             │
           │  daily_sales         │
           │  query_history       │
           └──────────────────────┘
```

## Request Flow: Natural Language Query

```
User question (English / Chinese)
        │
        ▼
Schema Retriever  ────────────────────────────────────────────────►  catalog.yaml
  tokenize(question) → score tables → top_k table names                  │
        │                                                      table descriptions
        ▼                                                      column names, keywords
Prompt Builder
  build_schema_prompt(relevant_tables)
        │
        ▼
Text2SQL Adapter (RuleBasedAdapter | OpenAIAdapter)
  generate_sql(question, schema_prompt, few_shot_examples)
        │
        ▼
SQL Validator (THREE-PASS)
  Pass 1: regex — null bytes, comments, forbidden keywords
  Pass 2: sqlparse AST — multi-statement, non-SELECT, comment tokens
  Pass 3: table whitelist — extract FROM/JOIN tables, check against RETAIL_TABLES
        │
        ├── UNSAFE ──► return ValidationResult(is_safe=False, reason=..., risk_level=CRITICAL|WARNING)
        │
        ▼  SAFE
Query Executor (read_only=True DuckDB connection)
  inject LIMIT if missing → execute with timeout → log to query_history
        │
        ▼
Chart Recommender
  infer_col_type per column → decision tree → ChartRecommendation
        │
        ▼
NLQueryResponse { sql, is_safe, safety_issues, columns, rows, execution_time_ms, chart_recommendation }
```

## Component Map

| Component | File | Role |
|---|---|---|
| Schema Retriever | `src/retrieval/schema_retriever.py` | Keyword-score table relevance |
| Catalog Loader | `src/features/catalog.py` | YAML → typed dataclasses |
| SQL Validator | `src/preprocessing/validator.py` | Three-pass safety filter |
| Query Executor | `src/preprocessing/query_executor.py` | Read-only DuckDB + timeout |
| Chart Recommender | `src/features/chart_recommender.py` | Column types → chart type |
| Rule-Based Adapter | `src/models/rule_based.py` | Regex-template SQL generator |
| LLM Adapter | `src/models/llm_adapter.py` | OpenAI stub (LLM_PROVIDER=openai) |
| ETL Loader | `src/ingestion/loader.py` | CSV → DuckDB via conn.register |
| Cleaners | `src/preprocessing/cleaner.py` | Per-table data validation |
| FastAPI App | `src/api/main.py` | REST layer, lifespan, DI |
| Streamlit App | `src/app/streamlit_app.py` | Browser UI, httpx calls API |

## Defense-in-Depth for SQL Safety

```
Layer 1: SQL Validator (src/preprocessing/validator.py)
  ├── Pass 1: Regex — fast, catches obvious forbidden keywords
  ├── Pass 2: sqlparse AST — structural analysis, not just lexical
  └── Pass 3: Table whitelist — only RETAIL_TABLES allowed

Layer 2: read_only=True DuckDB connection (query_executor.py)
  └── Even if validator has a bug, the DB connection itself refuses writes

Layer 3: LIMIT injection
  └── Prevents full-table scans from returning unbounded rows
```

## Dependency Injection (FastAPI)

```python
# app.state populated at startup (lifespan)
app.state.db     # writable DuckDB connection for query_history
app.state.catalog # loaded Catalog object
app.state.executor  # QueryExecutor wrapping read-only connection

# Route handlers receive via Depends()
def route(db = Depends(get_db), catalog = Depends(get_catalog)):
    ...

# Test override (conftest.py)
app.dependency_overrides[get_db] = lambda: in_memory_db
```
