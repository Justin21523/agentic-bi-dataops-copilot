"""DuckDB warehouse: connection factory and schema DDL creation."""
from __future__ import annotations

from pathlib import Path

import duckdb

_DDL_CUSTOMERS = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id  VARCHAR PRIMARY KEY,
    name         VARCHAR NOT NULL,
    email        VARCHAR,
    city         VARCHAR,
    state        VARCHAR,
    country      VARCHAR DEFAULT 'US',
    segment      VARCHAR,
    signup_date  DATE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_DDL_PRODUCTS = """
CREATE TABLE IF NOT EXISTS products (
    product_id      VARCHAR PRIMARY KEY,
    name            VARCHAR NOT NULL,
    category        VARCHAR NOT NULL,
    subcategory     VARCHAR,
    price           DOUBLE NOT NULL,
    cost            DOUBLE,
    stock_quantity  INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_DDL_ORDERS = """
CREATE TABLE IF NOT EXISTS orders (
    order_id          VARCHAR PRIMARY KEY,
    customer_id       VARCHAR NOT NULL,
    order_date        TIMESTAMP NOT NULL,
    status            VARCHAR NOT NULL,
    shipping_city     VARCHAR,
    shipping_state    VARCHAR,
    shipping_country  VARCHAR DEFAULT 'US',
    total_amount      DOUBLE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_DDL_ORDER_ITEMS = """
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id  VARCHAR PRIMARY KEY,
    order_id       VARCHAR NOT NULL,
    product_id     VARCHAR NOT NULL,
    quantity       INTEGER NOT NULL,
    unit_price     DOUBLE NOT NULL,
    discount       DOUBLE DEFAULT 0.0,
    line_total     DOUBLE NOT NULL
)
"""

_DDL_PAYMENTS = """
CREATE TABLE IF NOT EXISTS payments (
    payment_id  VARCHAR PRIMARY KEY,
    order_id    VARCHAR NOT NULL,
    method      VARCHAR NOT NULL,
    amount      DOUBLE NOT NULL,
    currency    VARCHAR DEFAULT 'USD',
    status      VARCHAR DEFAULT 'completed',
    paid_at     TIMESTAMP
)
"""

_DDL_REVIEWS = """
CREATE TABLE IF NOT EXISTS reviews (
    review_id    VARCHAR PRIMARY KEY,
    order_id     VARCHAR NOT NULL,
    product_id   VARCHAR,
    customer_id  VARCHAR NOT NULL,
    score        INTEGER NOT NULL,
    comment      VARCHAR,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_DDL_DAILY_SALES = """
CREATE TABLE IF NOT EXISTS daily_sales (
    date              DATE PRIMARY KEY,
    revenue           DOUBLE NOT NULL,
    order_count       INTEGER NOT NULL,
    avg_order_value   DOUBLE NOT NULL,
    unique_customers  INTEGER NOT NULL,
    units_sold        INTEGER NOT NULL,
    top_category      VARCHAR,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_DDL_QUERY_HISTORY = """
CREATE TABLE IF NOT EXISTS query_history (
    id                BIGINT,
    timestamp         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    question          VARCHAR,
    sql               VARCHAR NOT NULL,
    row_count         INTEGER,
    execution_time_ms DOUBLE,
    is_safe           BOOLEAN,
    error_message     VARCHAR
)
"""

_ALL_DDL: list[str] = [
    _DDL_CUSTOMERS,
    _DDL_PRODUCTS,
    _DDL_ORDERS,
    _DDL_ORDER_ITEMS,
    _DDL_PAYMENTS,
    _DDL_REVIEWS,
    _DDL_DAILY_SALES,
    _DDL_QUERY_HISTORY,
]

RETAIL_TABLES = frozenset({
    "orders", "order_items", "customers",
    "products", "payments", "reviews", "daily_sales",
})


def get_connection(path: str | None = None) -> duckdb.DuckDBPyConnection:
    """Return a persistent DuckDB connection, creating parent dirs if needed."""
    if path is None:
        from utils.config import get_settings
        path = get_settings().duckdb_path
    if path != ":memory:":
        Path(path).parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(path)


def create_schema(conn: duckdb.DuckDBPyConnection) -> None:
    """Execute all CREATE TABLE IF NOT EXISTS DDL statements."""
    for ddl in _ALL_DDL:
        conn.execute(ddl)
