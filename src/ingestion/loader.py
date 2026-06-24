"""ETL orchestrator: per-table CSVs → DuckDB + materialized daily_sales view."""
from __future__ import annotations

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

    conn.close()
    log.info("=" * 60)
    log.info("ETL Pipeline complete")
    log.info("=" * 60)


if __name__ == "__main__":
    run_etl()
