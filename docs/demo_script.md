# Demo Script

Step-by-step walkthrough for demonstrating the system end-to-end.

## Prerequisites

```bash
git clone <repo>
cd agentic-bi-dataops-copilot
cp .env.example .env
make install
```

## Step 1: Generate Data

```bash
make sample-data
```

**What to show:** The script creates 6 CSV files in `data/sample/`:

```
data/sample/
├── customers.csv   (300 rows)
├── products.csv    (100 rows)
├── orders.csv      (750 rows)
├── order_items.csv (~2,200 rows)
├── payments.csv    (750 rows)
└── reviews.csv     (~450 rows)
```

Key talking point: Uses `np.random.default_rng(42)` — the exact same data every time, reproducible for CI/CD.

## Step 2: Load Warehouse

```bash
make etl
```

**What to show:**
- Cleaners validate and coerce types before loading
- `daily_sales` is materialized from a CTE (not loaded from CSV) — demonstrates pre-aggregation
- `query_history` table is empty (will fill during demo)

Optionally inspect:

```bash
python -c "
import duckdb
conn = duckdb.connect('data/warehouse.duckdb', read_only=True)
for tbl in ['customers','orders','order_items','payments','reviews','daily_sales']:
    n = conn.execute(f'SELECT COUNT(*) FROM {tbl}').fetchone()[0]
    print(f'{tbl}: {n:,} rows')
"
```

## Step 3: Start the API

```bash
make api
```

Open `http://localhost:8000/docs` (Swagger UI) — show the 9 endpoints.

Quick health check:

```bash
curl http://localhost:8000/health | python -m json.tool
```

## Step 4: Start the Frontend

In another terminal:

```bash
make app
```

Open `http://localhost:8501`

## Step 5: Live Demo — NL Query Page

Navigate to **NL Query** in the sidebar.

### Demo Query 1: Simple aggregation

> **Question:** "Show me total revenue by month"

Expected flow:
1. Schema Retriever selects: `payments`, `orders`
2. Rule-based adapter generates DATE_TRUNC SQL
3. Validator: `✓ SAFE` — pure SELECT, whitelisted tables
4. Executor runs query in < 50ms
5. Chart Recommender returns: `line` chart (date + numeric)
6. Result: line chart + data table

### Demo Query 2: Multi-table join

> **Question:** "Top 10 customers by total spending"

Expected flow:
1. Schema Retriever selects: `customers`, `orders`, `payments`
2. 3-table JOIN generated
3. `✓ SAFE`
4. Result: horizontal bar chart (categorical + numeric)

### Demo Query 3: Security block

> **Question:** *(type directly in the question box)* `DROP TABLE customers`

Expected flow:
1. Rule-based adapter generates the literal SQL passed
2. Validator Pass 1: detects `DROP` keyword
3. Returns `✗ BLOCKED` — `risk_level: CRITICAL`
4. Red badge shown, SQL is displayed but **not executed**
5. DuckDB is untouched

Key talking point: **Two layers of defense** — validator + read-only connection.

### Demo Query 4: Unsupported pattern (LLM upgrade path)

> **Question:** "Show me products that have never been reviewed"

Expected flow:
1. Rule-based adapter: no template matches → returns friendly error
2. Display shows suggestion: "Consider setting LLM_PROVIDER=openai for this query"
3. This demonstrates the honest limitation of the rule-based baseline

## Step 6: Query History Page

Navigate to **Query History**.

- Show the table with 3+ entries from the demo
- Expand any row to see full SQL
- Highlight: history is stored in DuckDB itself — queryable via the API

## Step 7: Data Quality Page

Navigate to **Data Quality**.

- Show null rates per table
- `payments.paid_at` should show nulls (failed payments have no paid_at)
- `reviews.comment` may have nulls (optional comments)
- Explain why these are acceptable nulls (modeled intentionally)

## Step 8: Metadata Explorer

Navigate to **Metadata Explorer**.

- Select `order_items` table
- Show: semantic tags (metric, fk, date), sample values, relationships
- Explain: this catalog is what the Schema Retriever uses to route questions to the right tables

## Step 9: Evaluation

```bash
make evaluate
```

Show the JSON output: valid_sql_rate, unsafe_rejection_rate (always 100%), per-difficulty breakdown.

---

## Docker Demo (Optional)

```bash
make docker-up
```

Visits `http://localhost:8501` — same app, containerized. Show that `API_BASE_URL=http://api:8000` allows Streamlit to reach the API inside Docker networking.

---

## Key Talking Points Summary

| Point | What to show |
|---|---|
| Safety-first design | SQL validator blocks DROP on the spot, not just the LLM |
| Defense-in-depth | read_only=True catches what the validator misses |
| Schema-aware prompting | Schema Retriever selects relevant tables, reducing hallucination |
| Evaluability | Benchmark + metrics framework, not just vibes |
| Rule-based baseline | Full demo without any API key |
| Honest limitations | Anti-join case fails with rule-based; this is documented and expected |
