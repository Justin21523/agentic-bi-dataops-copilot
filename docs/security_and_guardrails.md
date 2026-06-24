# Security & SQL Guardrails

## Threat Model

The system exposes a natural language interface that generates and executes SQL. The primary threat is **SQL injection or manipulation** — either via the user question or by a compromised LLM output — that could:

1. **Data exfiltration** from non-whitelisted tables (system catalogs, internal tables)
2. **Data destruction** via DDL/DML operations (DROP, DELETE, UPDATE)
3. **Privilege escalation** via GRANT, REVOKE, ATTACH, PRAGMA
4. **Resource exhaustion** via unbounded full-table scans

## Defense-in-Depth Architecture

```
User Question → Text2SQL → [Validator] → [Read-only DB] → Result
                               │
                    ┌──────────▼──────────┐
                    │  Three-Pass Guardrail│
                    │                     │
                    │  Pass 1: Regex       │  fast, stateless
                    │  Pass 2: AST         │  structural
                    │  Pass 3: Whitelist   │  semantic
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ read_only=True conn  │  DuckDB-level enforcement
                    └─────────────────────┘
```

No single layer is the sole safety control. A bug in the validator cannot cause a write because the database connection itself is read-only.

## Validator Ruleset (Three Passes)

### Pass 1: Regex Pre-screening

Detects forbidden patterns at the character level before any parsing. Fails fast.

| Pattern | Block reason |
|---|---|
| Null bytes (`\x00`) | Bypass attempt |
| `--` or `/*` or `*/` | SQL comments used to inject |
| `DROP` | DDL destruction |
| `DELETE` | DML destruction |
| `UPDATE` | DML write |
| `INSERT` | DML write |
| `ALTER` | DDL schema change |
| `TRUNCATE` | DDL destruction |
| `CREATE` | DDL creation |
| `REPLACE` | DDL/DML write |
| `MERGE` | DML write |
| `EXEC` / `EXECUTE` | Stored procedure execution |
| `GRANT` / `REVOKE` | Privilege manipulation |
| `ATTACH` / `DETACH` | Database mounting (file read) |
| `COPY` | Bulk I/O |
| `VACUUM` | Maintenance DDL |
| `PRAGMA` | SQLite/DuckDB engine settings |
| `CALL` | Procedure call |
| `LOAD` / `IMPORT` / `EXPORT` | External I/O |

All patterns are word-boundary checked (`\b`) and case-insensitive.

### Pass 2: sqlparse AST Analysis

Structural analysis that complements Pass 1.

| Check | Rationale |
|---|---|
| Multi-statement detection | `SELECT 1; DROP TABLE x` passes regex if DROP is found, but multi-statement bypasses some regex patterns |
| Statement type != SELECT | `sqlparse.parse(sql)[0].get_type()` returns DML/DDL for non-SELECT statements |
| Comment token walk | Belt-and-suspenders for inline comments that Pass 1 might miss |

### Pass 3: Table Whitelist

Only `RETAIL_TABLES` are allowed in FROM/JOIN clauses.

```python
RETAIL_TABLES = frozenset({
    "orders", "order_items", "customers",
    "products", "payments", "reviews", "daily_sales",
})
```

Table extraction uses both regex (`FROM\s+(\w+)`, `JOIN\s+(\w+)`) and AST walking to handle aliases (`FROM orders o` → `orders`). CTEs are accounted for: CTE names defined in `WITH` clauses are treated as virtual tables and allowed.

### Warnings (not CRITICAL but still blocked in strict mode)

| Warning | Condition | Risk |
|---|---|---|
| Unbounded SELECT * | `SELECT *` without WHERE or LIMIT | Resource exhaustion |
| Deep subquery nesting | Subquery depth > 3 | DoS via query planning |

In strict mode (API default), warnings cause `is_safe=False`. In evaluation mode (used by `evaluator.py`), warnings are logged but do not block.

## Additional Safeguards

### Row Limit Injection

Even if a valid SELECT returns millions of rows, the executor wraps it:

```sql
-- original:
SELECT customer_id FROM customers

-- executed as:
SELECT * FROM (SELECT customer_id FROM customers) _q LIMIT 10000
```

The limit is configurable via `MAX_ROWS` env var (default 10000).

### Query Timeout

Queries are executed in a `threading.Thread` with a join timeout. If the thread doesn't complete within `QUERY_TIMEOUT` seconds (default 30), the DuckDB connection is closed and re-opened (DuckDB has no Python-level query cancel API).

### Read-Only Connection

```python
self._conn = duckdb.connect(db_path, read_only=True)
```

DuckDB enforces this at the engine level. Any write attempt raises an error regardless of what SQL was validated.

### Query History Separate Connection

The `query_history` table needs a writable connection. This is a **different connection** from the read-only executor connection, opened at API startup and stored on `app.state`. It is the only writable connection in the system.

## Security Properties

| Property | Guarantee |
|---|---|
| No DDL execution | Enforced by Pass 1 regex + Pass 2 AST + read_only=True |
| No DML execution | Enforced by Pass 1 regex + read_only=True |
| No table escape | Enforced by Pass 3 whitelist |
| No unbounded scans | Enforced by LIMIT injection |
| No runaway queries | Enforced by thread timeout |
| No secret exposure | No `information_schema` or `pg_catalog` in whitelist |

## Known Limitations

1. **Regex can be fooled by unusual whitespace** — Pass 2 AST is the backup.
2. **sqlparse is not a fully compliant SQL parser** — extreme edge cases may parse incorrectly. sqlglot is available as an upgrade path.
3. **No rate limiting** — the API does not enforce per-IP query limits. Add a reverse proxy (nginx, Traefik) for production.
4. **No authentication** — all endpoints are public. Add JWT/OAuth at the FastAPI middleware layer for production.
5. **LLM adapter trust** — the OpenAI adapter's output is validated by the same guardrail before execution. The LLM is not trusted to produce safe SQL.
