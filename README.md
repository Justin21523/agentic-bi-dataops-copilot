# Agentic BI / DataOps Copilot

**Schema-aware Text2SQL + SQL Guardrails over a DuckDB retail warehouse**

中文/英文雙語自然語言分析平台 · 三重 SQL 安全驗證 · 本地 DuckDB · 零 API Key 可運行

---

## Overview / 專案概述

Agentic BI / DataOps Copilot 是一個面向資料倉儲的自然語言分析平台。使用者可以用中文或英文提問，系統會進行 schema retrieval、Text2SQL、SQL safety validation、query execution、chart recommendation、query history 與 data quality checks。

This is a **portfolio-quality, production-like** repository demonstrating:

- **Schema-aware Text2SQL** — keyword-scored catalog retrieval → SQL generation
- **Three-pass SQL guardrails** — regex + AST + table whitelist; defense-in-depth with read-only DuckDB
- **Zero-dependency baseline** — rule-based adapter runs with no LLM API key
- **Evaluability** — benchmark YAML + metrics (valid_sql_rate, unsafe_rejection_rate, execution_accuracy)
- **Beautiful frontend** — Streamlit with Plotly charts, live API health badge, polished UI

> 這個專案重點是安全、可解釋、可評估，不是讓 agent 看起來很炫。  
> The focus is safety, explainability, and evaluability — not making the agent look impressive.

---

## Quick Start

```bash
git clone <repo-url> agentic-bi-dataops-copilot
cd agentic-bi-dataops-copilot

cp .env.example .env
make install        # uv sync

make sample-data    # generate synthetic retail CSV files
make etl            # load into DuckDB warehouse

make api            # FastAPI on :8000 (keep running in tab 1)
make app            # Streamlit on :8501 (tab 2)
```

Then open **http://localhost:8501** and ask:

> "Show me top 10 customers by revenue"

---

## System Architecture

```
User Question (EN/ZH)
        │
        ▼
Schema Retriever ──► catalog.yaml ──► relevant table DDL
        │
        ▼
Text2SQL Adapter (rule-based default | OpenAI via LLM_PROVIDER=openai)
        │
        ▼
SQL Validator ─── THREE PASSES ───────────────────────────────────────
  Pass 1: Regex (DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE + 15 more)
  Pass 2: sqlparse AST (multi-statement, non-SELECT, comment injection)
  Pass 3: Table whitelist (only RETAIL_TABLES allowed)
        │
        ├── BLOCKED ──► ValidationResult(is_safe=False, risk_level=CRITICAL|WARNING)
        │
        ▼ SAFE
Query Executor (read_only=True DuckDB — defense layer 2)
  Inject LIMIT → Execute with timeout → Log to query_history
        │
        ▼
Chart Recommender → Plotly visualization
```

---

## Repository Structure

```
agentic-bi-dataops-copilot/
├── src/
│   ├── ingestion/          # DuckDB DDL, ETL loader
│   ├── preprocessing/      # Cleaner, SQL validator, Query executor
│   ├── features/           # Catalog loader, Chart recommender
│   ├── models/             # Rule-based + LLM Text2SQL adapters
│   ├── retrieval/          # Schema retriever (keyword scoring)
│   ├── evaluation/         # Benchmark runner + metrics
│   ├── api/                # FastAPI: schemas, routes, dependencies
│   └── app/                # Streamlit: home + 4 pages
├── configs/
│   ├── settings.yaml       # Default configuration
│   ├── few_shot_examples.yaml
│   └── benchmark_queries.yaml
├── data/
│   └── metadata/catalog.yaml  # Rich semantic catalog (single source of truth)
├── docs/
│   ├── architecture.md
│   ├── security_and_guardrails.md
│   ├── model_card.md
│   ├── data_card.md
│   ├── evaluation.md
│   └── demo_script.md
├── tests/                  # pytest — 20+ test functions
├── scripts/                # generate_sample_data.py, run_etl.py
├── Dockerfile
├── docker-compose.yml
└── Makefile
```

---

## Warehouse Tables

| Table | Description | Rows |
|---|---|---|
| `customers` | Retail customers with segment | ~300 |
| `products` | 100 SKUs across 8 categories | 100 |
| `orders` | Order header with status | ~750 |
| `order_items` | Line items with discount | ~2,200 |
| `payments` | 1:1 with orders, multi-method | ~750 |
| `reviews` | Product reviews (1–5 stars) | ~450 |
| `daily_sales` | ETL-materialized daily KPIs | varies |
| `query_history` | All past queries (queryable) | grows |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | API + DB status |
| `GET` | `/metadata/tables` | List all catalog tables |
| `GET` | `/metadata/tables/{name}` | Table schema + column details |
| `POST` | `/query/nl` | NL → SQL → execute → chart |
| `POST` | `/query/sql/validate` | Validate SQL safety |
| `POST` | `/query/sql/execute` | Execute validated SQL |
| `GET` | `/query/history` | Query history |
| `POST` | `/chart/recommend` | Column types → chart type |
| `GET` | `/dq/report` | Null rates + distinct counts |

Interactive docs: **http://localhost:8000/docs**

---

## Streamlit Pages

| Page | Description |
|---|---|
| Home | API health status, feature overview |
| NL Query | Question → SQL → safety badge → results → chart |
| Query History | Browsable history with expandable SQL |
| Data Quality | Per-table null rates + Plotly bar charts |
| Metadata Explorer | Schema browser with semantic tags + data preview |

---

## SQL Safety Guardrails

```
Three-pass validator (src/preprocessing/validator.py):

Pass 1 — Regex:     DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE,
                    CREATE, REPLACE, MERGE, EXEC, GRANT, REVOKE,
                    ATTACH, DETACH, COPY, VACUUM, PRAGMA, LOAD,
                    null bytes, SQL comments (--, /**/)

Pass 2 — AST:       Multi-statement (semicolons), non-SELECT type,
                    comment token injection

Pass 3 — Whitelist: Only {orders, order_items, customers, products,
                    payments, reviews, daily_sales} allowed

Layer 2:            read_only=True DuckDB connection (engine-enforced)
Layer 3:            LIMIT injection — all queries capped at MAX_ROWS
Layer 4:            Thread timeout — queries killed after QUERY_TIMEOUT seconds
```

---

## Text2SQL Adapters

### Rule-Based (default, zero cost)

10 regex-template patterns covering common retail analytics queries. No API key required.

### OpenAI GPT-4o (upgrade)

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
make api
```

Schema-aware system prompt + 7 curated few-shot examples. All LLM output is passed through the same validator before execution — the LLM is never trusted directly.

---

## Evaluation

```bash
make evaluate
```

Runs 12 benchmark cases (8 safe queries + 4 unsafe rejections):

| Metric | Target |
|---|---|
| `unsafe_rejection_rate` | **100%** |
| `valid_sql_rate` (rule-based) | > 75% |
| `execution_accuracy` | > 70% |
| `false_positive_rate` | < 5% |

---

## Docker

```bash
make docker-up
# API:  http://localhost:8000
# App:  http://localhost:8501
```

The Streamlit container automatically connects to the API container via `API_BASE_URL=http://api:8000`.

---

## Configuration

Copy `.env.example` to `.env` and adjust:

```bash
DUCKDB_PATH=data/warehouse.duckdb    # DuckDB file path
LLM_PROVIDER=rule_based              # or: openai
OPENAI_API_KEY=your_key_here         # only needed for LLM_PROVIDER=openai
MAX_ROWS=10000                       # max rows per query
QUERY_TIMEOUT=30                     # seconds before query is killed
LOG_LEVEL=INFO
```

---

## Development

```bash
make test        # pytest -v
make lint        # ruff check
make format      # ruff format
make test-cov    # coverage report
```

All tests use an in-memory DuckDB with injected seed data. No disk I/O, no external services required.

---

## What Remains for Production

1. Authentication — add JWT/OAuth middleware to FastAPI
2. Rate limiting — add per-IP limits via a reverse proxy or middleware
3. OpenAI adapter — the stub needs real API call implementation
4. Spider/BIRD evaluation — add external benchmark adapter
5. Semantic search — replace keyword scoring with sentence-transformer embeddings
6. Streaming responses — add SSE for real-time query progress
7. Multi-tenancy — namespace query_history by user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Pydantic v2 |
| Package manager | uv |
| Database | DuckDB (OLAP, in-process) |
| Data processing | pandas, numpy |
| SQL parsing | sqlparse, sqlglot |
| Frontend | Streamlit, Plotly |
| HTTP client | httpx |
| Config | pydantic-settings + YAML |
| Tests | pytest |
| Container | Docker, docker-compose |

---

## License

MIT — see LICENSE. This project uses synthetic data only. No real customer information.

---

## 致謝 / Acknowledgements

This project was built as a portfolio demonstration of production-quality data engineering and AI safety patterns. The dataset is entirely synthetic.
