# Model Card: Text2SQL Strategies

## Overview

This system supports two Text2SQL strategies selectable via the `LLM_PROVIDER` environment variable:

| Provider | `LLM_PROVIDER` value | Cost | Accuracy |
|---|---|---|---|
| Rule-based (default) | `rule_based` | Zero | High for supported patterns |
| OpenAI GPT-4o | `openai` | API cost | Broad coverage |

The rule-based adapter is the **zero-cost default**. The entire system runs without any API key.

---

## Rule-Based Adapter (`src/models/rule_based.py`)

### Mechanism

Regex pattern matching against the user's question. The first matching template wins. Named capture groups from the regex are substituted into the SQL template.

### Supported Patterns

| # | Pattern | Example question | SQL template |
|---|---|---|---|
| 1 | Top N customers by revenue | "top 10 customers by total spending" | JOIN orders+payments, GROUP BY customer, ORDER BY SUM DESC |
| 2 | Revenue by time period | "total revenue by month" | DATE_TRUNC on paid_at, SUM(amount) |
| 3 | Daily sales trend | "daily sales trend last 30 days" | SELECT from daily_sales, ORDER BY date |
| 4 | Revenue by product category | "revenue breakdown by category" | JOIN order_items+products, GROUP BY category |
| 5 | Order count by status | "orders by status" | GROUP BY status on orders |
| 6 | Average product rating per category | "average rating by category" | JOIN reviews+products, AVG(score) |
| 7 | Best-selling products | "top selling products" | JOIN order_items+products, SUM(quantity) |
| 8 | List all customers | "show me all customers" | SELECT from customers LIMIT N |
| 9 | Customer count by segment | "customers by segment" | GROUP BY segment on customers |
| 10 | Payment method breakdown | "payment methods used" | GROUP BY method on payments |

### Limitations

- Only supports the patterns above. Other questions fall through with `NotImplementedError`.
- The API returns a friendly message suggesting `LLM_PROVIDER=openai` for unsupported questions.
- No semantic understanding — "clients who bought the most" may not match if phrased very differently from the template.
- No JOIN inference — patterns have hardcoded join paths for their use case.

### Strengths

- Zero cost, zero latency from external APIs
- Fully deterministic — same question always produces the same SQL
- Easy to audit and extend (add a `Template` object to the list)

---

## LLM Adapter (`src/models/llm_adapter.py`)

### Mechanism

Schema-aware prompting:

```
System prompt:
  "You are an expert SQL analyst for a retail data warehouse..."
  + schema context (relevant table DDL from catalog)
  + few-shot examples (from configs/few_shot_examples.yaml)

User prompt:
  "Generate a DuckDB SQL query for: {question}"
```

### Few-Shot Examples (`configs/few_shot_examples.yaml`)

7 curated examples covering:
- Monthly revenue aggregation
- Top-N customers by spend
- Average rating per category
- Daily sales trend
- Order status breakdown
- Anti-join (products never reviewed) — demonstrates LEFT JOIN + IS NULL
- Month-over-month growth using LAG window function

### Output Processing

The LLM's raw response is passed through `_strip_markdown_fences()` to remove ` ```sql ` wrappers, then through the full SQL validator before execution. The LLM output is **never trusted directly**.

### Notes

- The adapter is a stub. Activate with `LLM_PROVIDER=openai` and `OPENAI_API_KEY`.
- Model defaults to `gpt-4o`. Override via `OPENAI_MODEL` env var.
- Typical latency: 2–8 seconds for GPT-4o at this schema size.

---

## Evaluation

See `docs/evaluation.md` for benchmark results on the 12-case benchmark suite.

---

## Known Failure Modes

| Failure mode | Cause | Mitigation |
|---|---|---|
| Rule mismatch | Question doesn't match any template | Fallback message; use LLM provider |
| Hallucinated columns | LLM invents column names | Schema prompt keeps LLM grounded; executor returns QueryError on bad SQL |
| Hallucinated tables | LLM uses non-whitelisted tables | Pass 3 whitelist blocks these |
| Ambiguous aggregation | "revenue" could mean payments.amount or order_items.line_total | Few-shot examples standardize to payments.amount for revenue |
| Chinese/English mix | Mixed language question | Both adapters handle it — LLM natively, rule-based via regex that ignores non-Latin prefixes |
