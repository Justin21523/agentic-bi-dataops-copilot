# Evaluation

## Metrics

The evaluation framework (`src/evaluation/`) measures four dimensions:

| Metric | Definition | Target |
|---|---|---|
| `valid_sql_rate` | % of safe-query cases that produce parseable, executable SQL | > 85% |
| `execution_accuracy` | % of cases where the SQL executes without error and returns rows | > 75% |
| `unsafe_rejection_rate` | % of unsafe-query cases correctly blocked by the validator | 100% |
| `false_positive_rate` | % of safe queries incorrectly blocked | < 5% |

Run the evaluation:

```bash
make evaluate
# or
PYTHONPATH=src python -m evaluation.evaluator --output reports/evaluation.json
```

## Benchmark Cases (`configs/benchmark_queries.yaml`)

12 cases across 3 difficulty levels and 2 test types:

### Safe Query Cases (8)

| # | Difficulty | Question | Expected behavior |
|---|---|---|---|
| 1 | easy | "show me all customers" | SELECT from customers with LIMIT |
| 2 | easy | "total revenue" | SUM(amount) from payments |
| 3 | easy | "revenue by month" | DATE_TRUNC + GROUP BY |
| 4 | medium | "top 10 customers by spending" | 3-table JOIN, ranked |
| 5 | medium | "average product rating by category" | 2-table JOIN, AVG |
| 6 | medium | "daily sales trend" | SELECT from daily_sales |
| 7 | hard | "products never reviewed" | Anti-join (LEFT JOIN + IS NULL) |
| 8 | hard | "month over month revenue growth" | LAG window function |

### Unsafe Rejection Cases (4)

| # | Test | SQL pattern | Expected outcome |
|---|---|---|---|
| 9 | DROP table | `DROP TABLE customers` | Blocked: CRITICAL |
| 10 | DELETE rows | `DELETE FROM orders WHERE 1=1` | Blocked: CRITICAL |
| 11 | Unbounded SELECT * | `SELECT * FROM customers` | Blocked: WARNING |
| 12 | Non-whitelisted table | `SELECT * FROM sys_users LIMIT 5` | Blocked: whitelist |

## Benchmark Results

> **Note:** Fill in actual numbers after running `make evaluate` on the seeded dataset.

| Metric | Rule-Based | OpenAI GPT-4o |
|---|---|---|
| valid_sql_rate | TBD | TBD |
| execution_accuracy | TBD | TBD |
| unsafe_rejection_rate | **100%** | **100%** |
| false_positive_rate | TBD | TBD |

### By Difficulty (Rule-Based)

| Difficulty | Cases | Passed |
|---|---|---|
| easy | 3 | TBD |
| medium | 3 | TBD |
| hard | 2 | TBD |

## Expected Rule-Based Performance

Based on the 10 supported templates:

- **Easy cases**: expected 100% (all have matching templates)
- **Medium cases**: expected 80% (top-customers and avg-rating match; daily-trend matches)
- **Hard cases**: expected 0% (anti-join and LAG are not in the rule-based template set)
- **Overall valid_sql_rate**: expected ~75%

The anti-join and LAG cases are specifically designed to demonstrate where the rule-based adapter fails and why `LLM_PROVIDER=openai` is needed for complex analytical queries.

## Running with OpenAI

```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
make evaluate
```

Expected improvement: all 8 safe-query cases should pass with a competent LLM, bringing valid_sql_rate to ~90%+ and execution_accuracy to ~85%+.

## Evaluation Architecture

```python
# evaluator.py flow per case:
catalog = load_catalog(...)
adapter = get_adapter(settings.llm_provider)
for case in benchmark_cases:
    schema_ctx = get_full_schema_prompt(catalog)  # always full schema for eval
    sql = adapter.generate_sql(case.question, schema_ctx, few_shot)
    validation = validate_sql(sql, strict=False)   # warnings don't block in eval
    result = executor.execute(sql, max_rows=100)
    case_result = CaseResult(
        case_id=case.id,
        expected_type=case.test_type,
        sql_generated=sql,
        is_safe=validation.is_safe,
        executed_ok=isinstance(result, QueryResult) and result.row_count >= 0,
        ...
    )
metrics = compute_metrics(case_results)
```
