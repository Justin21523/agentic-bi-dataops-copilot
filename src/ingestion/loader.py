"""ETL orchestrator: per-table CSVs → DuckDB + materialized daily_sales view."""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable

import duckdb
import pandas as pd

from ingestion.warehouse import create_schema, get_connection
from preprocessing.cleaner import TABLE_CLEANERS
from utils.config import get_settings
from utils.log import get_logger

log = get_logger(__name__)

TABLE_LOAD_ORDER = [
    "customers",
    "products",
    "orders",
    "order_items",
    "payments",
    "reviews",
]

_MATERIALIZE_DAILY_SALES = """
INSERT INTO daily_sales
WITH daily_base AS (
    SELECT
        CAST(o.order_date AS DATE)        AS date,
        SUM(p.amount)                      AS revenue,
        COUNT(DISTINCT o.order_id)         AS order_count,
        COUNT(DISTINCT o.customer_id)      AS unique_customers,
        SUM(oi.quantity)                   AS units_sold
    FROM orders o
    JOIN payments p  ON p.order_id  = o.order_id
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE p.status = 'completed'
    GROUP BY CAST(o.order_date AS DATE)
),
daily_category AS (
    SELECT
        CAST(o.order_date AS DATE) AS date,
        pr.category,
        SUM(oi.line_total)         AS cat_revenue,
        ROW_NUMBER() OVER (
            PARTITION BY CAST(o.order_date AS DATE)
            ORDER BY SUM(oi.line_total) DESC
        ) AS rn
    FROM orders o
    JOIN payments p  ON p.order_id  = o.order_id
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN products pr    ON pr.product_id = oi.product_id
    WHERE p.status = 'completed'
    GROUP BY CAST(o.order_date AS DATE), pr.category
)
SELECT
    b.date,
    b.revenue,
    b.order_count,
    ROUND(b.revenue / b.order_count, 2) AS avg_order_value,
    b.unique_customers,
    b.units_sold,
    c.category                           AS top_category,
    CURRENT_TIMESTAMP                    AS updated_at
FROM daily_base b
LEFT JOIN daily_category c ON c.date = b.date AND c.rn = 1
ORDER BY b.date
"""


def load_table_from_csv(
    conn: duckdb.DuckDBPyConnection,
    table_name: str,
    csv_path: Path,
    cleaner_fn: Callable[[pd.DataFrame], pd.DataFrame] | None = None,
) -> int:
    """Load one CSV into DuckDB, optionally cleaning first.

    Uses conn.register() + INSERT INTO for zero-copy DuckDB-native bulk load.
    """
    log.info(f"Loading {table_name} from {csv_path}")
    df = pd.read_csv(csv_path)
    raw_count = len(df)

    if cleaner_fn is not None:
        df = cleaner_fn(df)

    staging = f"_staging_{table_name}"
    conn.execute(f"DELETE FROM {table_name}")
    conn.register(staging, df)
    conn.execute(f"INSERT INTO {table_name} SELECT * FROM {staging}")
    conn.unregister(staging)

    loaded = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
    log.info(f"  {table_name}: {raw_count} raw → {loaded} loaded rows")
    return loaded


def materialize_daily_sales(conn: duckdb.DuckDBPyConnection) -> None:
    """Compute and populate daily_sales from orders, order_items, payments.

    Only counts completed payments. Uses CTE + window function to find top
    revenue category per day.
    """
    conn.execute("DELETE FROM daily_sales")
    conn.execute(_MATERIALIZE_DAILY_SALES)
    n = conn.execute("SELECT COUNT(*) FROM daily_sales").fetchone()[0]
    log.info(f"daily_sales: {n} rows materialized")


def seed_query_history(conn: duckdb.DuckDBPyConnection) -> None:
    """Seed realistic query history so GuardrailAnalytics shows data on first run."""
    conn.execute("DELETE FROM query_history")
    now = datetime.now()

    safe_sqls = [
        ("月份銷售趨勢", "SELECT DATE_TRUNC('month', order_date) AS month, SUM(total_amount) AS rev FROM orders WHERE status='completed' GROUP BY 1 ORDER BY 1"),
        ("Top 10 客戶 LTV", "SELECT c.name, ROUND(SUM(p.amount),2) AS ltv FROM customers c JOIN orders o ON c.customer_id=o.customer_id JOIN payments p ON o.order_id=p.order_id WHERE p.status='completed' GROUP BY c.customer_id, c.name ORDER BY ltv DESC LIMIT 10"),
        ("商品分類收入", "SELECT pr.category, ROUND(SUM(oi.line_total),2) AS revenue FROM products pr JOIN order_items oi ON pr.product_id=oi.product_id GROUP BY pr.category ORDER BY revenue DESC"),
        ("付款方式統計", "SELECT method, COUNT(*) AS cnt, ROUND(SUM(amount),2) AS total FROM payments WHERE status='completed' GROUP BY method ORDER BY total DESC"),
        ("評分分布", "SELECT CAST(score AS INTEGER) AS stars, COUNT(*) AS count FROM reviews GROUP BY stars ORDER BY stars"),
        ("客戶地理分布", "SELECT state, COUNT(DISTINCT customer_id) AS customers FROM customers WHERE state IS NOT NULL GROUP BY state ORDER BY customers DESC"),
        ("每月新客戶", "SELECT DATE_TRUNC('month', signup_date)::VARCHAR AS month, COUNT(*) AS new_customers FROM customers WHERE signup_date IS NOT NULL GROUP BY 1 ORDER BY 1"),
        ("庫存預警", "SELECT name, category, stock_quantity FROM products WHERE stock_quantity < 10 ORDER BY stock_quantity LIMIT 20"),
        ("訂單狀態分布", "SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC"),
        ("RFM 分析", "SELECT c.segment, COUNT(DISTINCT c.customer_id) AS customers FROM customers c GROUP BY c.segment ORDER BY customers DESC"),
        ("日銷售趨勢", "SELECT CAST(order_date AS DATE) AS day, COUNT(*) AS orders FROM orders WHERE status='completed' GROUP BY day ORDER BY day DESC LIMIT 30"),
    ]

    blocked_sqls = [
        ("刪除資料表", "DROP TABLE orders", "Forbidden keyword: DROP"),
        ("批量更新", "UPDATE customers SET segment='VIP' WHERE 1=1", "Forbidden keyword: UPDATE"),
        ("不安全掃描", "SELECT * FROM customers", "SELECT * is not allowed — specify columns explicitly"),
        ("多語句注入", "SELECT name FROM customers; DROP TABLE payments", "Forbidden keyword: DROP"),
        ("刪除記錄", "DELETE FROM order_items WHERE 1=1", "Forbidden keyword: DELETE"),
        ("跨表清空", "TRUNCATE TABLE reviews", "Forbidden keyword: TRUNCATE"),
    ]

    rows = []
    rid = 1
    hours = [9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20]

    for day in range(30, 0, -1):
        base = now - timedelta(days=day)
        for hour in hours:
            q = safe_sqls[(rid - 1) % len(safe_sqls)]
            ts = base.replace(hour=hour, minute=(rid * 7) % 60, second=0, microsecond=0)
            exec_ms = round(35.0 + (rid % 13) * 18.5, 2)
            rows.append((rid, ts, q[0], q[1], 5 + (rid % 45), exec_ms, True, None))
            rid += 1

    for i, (q_name, q_sql, err) in enumerate(blocked_sqls * 2):
        day = max(1, 28 - i * 2)
        hour = 10 + (i % 6)
        base = now - timedelta(days=day)
        ts = base.replace(hour=hour, minute=i * 5 % 60, second=0, microsecond=0)
        rows.append((rid, ts, q_name, q_sql, None, None, False, err))
        rid += 1

    conn.executemany(
        "INSERT INTO query_history (id, timestamp, question, sql, row_count, execution_time_ms, is_safe, error_message) VALUES (?,?,?,?,?,?,?,?)",
        rows,
    )
    n = conn.execute("SELECT COUNT(*) FROM query_history").fetchone()[0]
    log.info(f"query_history: {n} seed rows inserted")


def run_etl(
    sample_dir: Path | None = None,
    db_path: str | None = None,
) -> None:
    """Run full ETL: schema creation → CSV loads → daily_sales materialization.

    Args:
        sample_dir: Directory containing per-table CSV files.
        db_path: DuckDB file path; defaults to settings.duckdb_path.
    """
    settings = get_settings()
    sample_dir = sample_dir or Path(settings.sample_data_path)
    db_path = db_path or settings.duckdb_path

    log.info("=" * 60)
    log.info("Agentic BI ETL Pipeline — starting")
    log.info(f"  Sample dir: {sample_dir}")
    log.info(f"  Database:   {db_path}")
    log.info("=" * 60)

    conn = get_connection(db_path)
    create_schema(conn)

    for table in TABLE_LOAD_ORDER:
        csv_path = sample_dir / f"{table}.csv"
        if not csv_path.exists():
            raise FileNotFoundError(
                f"Missing CSV for table '{table}': {csv_path}\n"
                "Run 'make sample-data' first."
            )
        load_table_from_csv(
            conn,
            table_name=table,
            csv_path=csv_path,
            cleaner_fn=TABLE_CLEANERS.get(table),
        )

    log.info("Materializing daily_sales aggregate...")
    materialize_daily_sales(conn)

    log.info("Seeding query_history sample data...")
    seed_query_history(conn)

    conn.close()
    log.info("=" * 60)
    log.info("ETL Pipeline complete")
    log.info("=" * 60)


if __name__ == "__main__":
    run_etl()
