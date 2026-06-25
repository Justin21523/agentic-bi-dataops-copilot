"""Shared pytest fixtures: in-memory DuckDB with full schema and seed data."""
from __future__ import annotations

import duckdb
import pytest
from fastapi.testclient import TestClient

DDL_SQL = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL, email VARCHAR,
    city VARCHAR, state VARCHAR, country VARCHAR DEFAULT 'US',
    segment VARCHAR, signup_date DATE, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL, category VARCHAR NOT NULL,
    subcategory VARCHAR, price DOUBLE NOT NULL, cost DOUBLE,
    stock_quantity INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR PRIMARY KEY, customer_id VARCHAR NOT NULL,
    order_date TIMESTAMP NOT NULL, status VARCHAR NOT NULL,
    shipping_city VARCHAR, shipping_state VARCHAR, shipping_country VARCHAR,
    total_amount DOUBLE, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL,
    product_id VARCHAR NOT NULL, quantity INTEGER NOT NULL,
    unit_price DOUBLE NOT NULL, discount DOUBLE DEFAULT 0.0, line_total DOUBLE NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
    payment_id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL,
    method VARCHAR NOT NULL, amount DOUBLE NOT NULL,
    currency VARCHAR DEFAULT 'USD', status VARCHAR DEFAULT 'completed', paid_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
    review_id VARCHAR PRIMARY KEY, order_id VARCHAR NOT NULL,
    product_id VARCHAR, customer_id VARCHAR NOT NULL,
    score INTEGER NOT NULL, comment VARCHAR, created_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS daily_sales (
    date DATE PRIMARY KEY, revenue DOUBLE NOT NULL, order_count INTEGER NOT NULL,
    avg_order_value DOUBLE NOT NULL, unique_customers INTEGER NOT NULL,
    units_sold INTEGER NOT NULL, top_category VARCHAR, updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS query_history (
    id BIGINT, timestamp TIMESTAMP, question VARCHAR, sql VARCHAR NOT NULL,
    row_count INTEGER, execution_time_ms DOUBLE, is_safe BOOLEAN, error_message VARCHAR
);
"""

SEED_SQL = """
INSERT INTO customers VALUES
  ('CUST-0001','Alice Johnson','alice@test.com','New York','NY','US','B2C','2023-01-15','2023-01-15 10:00:00'),
  ('CUST-0002','Bob Smith','bob@test.com','Chicago','IL','US','B2B','2023-03-01','2023-03-01 09:00:00'),
  ('CUST-0003','Carol Williams','carol@test.com','Los Angeles','CA','US','SMB','2023-06-01','2023-06-01 08:00:00'),
  ('CUST-0004','David Brown','david@test.com','Houston','TX','US','B2C','2023-09-15','2023-09-15 11:00:00'),
  ('CUST-0005','Elena Davis','elena@test.com','Phoenix','AZ','US','B2C','2024-01-01','2024-01-01 12:00:00');

INSERT INTO products VALUES
  ('PROD-001','Wireless Headphones','Electronics','Audio',79.99,35.0,50,true,'2023-01-01 00:00:00'),
  ('PROD-002','USB-C Cable','Electronics','Accessories',12.99,4.0,200,true,'2023-01-01 00:00:00'),
  ('PROD-003','Yoga Mat','Sports & Outdoors','Fitness',29.99,11.0,80,true,'2023-01-01 00:00:00'),
  ('PROD-004','Python Book','Books','Programming',39.99,15.0,100,true,'2023-01-01 00:00:00'),
  ('PROD-005','Coffee Maker','Home & Garden','Kitchen',79.99,32.0,30,true,'2023-01-01 00:00:00'),
  ('PROD-006','Running Shoes','Apparel','Footwear',89.99,35.0,60,true,'2023-01-01 00:00:00'),
  ('PROD-007','Dark Chocolate','Food & Grocery','Confectionery',14.99,5.0,150,true,'2023-01-01 00:00:00'),
  ('PROD-008','Face Moisturizer','Beauty','Skincare',29.99,11.0,70,true,'2023-01-01 00:00:00'),
  ('PROD-009','Camping Tent','Sports & Outdoors','Camping',149.99,62.0,20,true,'2023-01-01 00:00:00'),
  ('PROD-010','LEGO Set','Toys','Building',89.99,38.0,40,true,'2023-01-01 00:00:00');

INSERT INTO orders VALUES
  ('ORD-000001','CUST-0001','2024-01-10 09:00:00','completed','New York','NY','US',79.99,'2024-01-10 09:00:00'),
  ('ORD-000002','CUST-0002','2024-01-15 10:00:00','completed','Chicago','IL','US',12.99,'2024-01-15 10:00:00'),
  ('ORD-000003','CUST-0003','2024-02-01 11:00:00','completed','Los Angeles','CA','US',59.98,'2024-02-01 11:00:00'),
  ('ORD-000004','CUST-0004','2024-02-14 14:00:00','completed','Houston','TX','US',39.99,'2024-02-14 14:00:00'),
  ('ORD-000005','CUST-0001','2024-03-01 09:00:00','cancelled','New York','NY','US',89.99,'2024-03-01 09:00:00'),
  ('ORD-000006','CUST-0005','2024-03-15 16:00:00','completed','Phoenix','AZ','US',149.99,'2024-03-15 16:00:00'),
  ('ORD-000007','CUST-0002','2024-04-01 13:00:00','returned','Chicago','IL','US',29.99,'2024-04-01 13:00:00'),
  ('ORD-000008','CUST-0003','2024-04-20 10:00:00','completed','Los Angeles','CA','US',14.99,'2024-04-20 10:00:00'),
  ('ORD-000009','CUST-0004','2024-05-01 08:00:00','pending','Houston','TX','US',89.99,'2024-05-01 08:00:00'),
  ('ORD-000010','CUST-0005','2024-05-15 15:00:00','completed','Phoenix','AZ','US',79.99,'2024-05-15 15:00:00');

INSERT INTO order_items VALUES
  ('ITEM-000001','ORD-000001','PROD-001',1,79.99,0.0,79.99),
  ('ITEM-000002','ORD-000002','PROD-002',1,12.99,0.0,12.99),
  ('ITEM-000003','ORD-000003','PROD-003',2,29.99,0.0,59.98),
  ('ITEM-000004','ORD-000004','PROD-004',1,39.99,0.0,39.99),
  ('ITEM-000005','ORD-000005','PROD-006',1,89.99,0.0,89.99),
  ('ITEM-000006','ORD-000006','PROD-009',1,149.99,0.0,149.99),
  ('ITEM-000007','ORD-000007','PROD-003',1,29.99,0.0,29.99),
  ('ITEM-000008','ORD-000008','PROD-007',1,14.99,0.0,14.99),
  ('ITEM-000009','ORD-000009','PROD-006',1,89.99,0.0,89.99),
  ('ITEM-000010','ORD-000010','PROD-001',1,79.99,0.0,79.99);

INSERT INTO payments VALUES
  ('PAY-000001','ORD-000001','credit_card',79.99,'USD','completed','2024-01-10 10:00:00'),
  ('PAY-000002','ORD-000002','paypal',12.99,'USD','completed','2024-01-15 10:30:00'),
  ('PAY-000003','ORD-000003','credit_card',59.98,'USD','completed','2024-02-01 11:30:00'),
  ('PAY-000004','ORD-000004','bank_transfer',39.99,'USD','completed','2024-02-14 14:30:00'),
  ('PAY-000005','ORD-000005','credit_card',89.99,'USD','failed',NULL),
  ('PAY-000006','ORD-000006','paypal',149.99,'USD','completed','2024-03-15 16:30:00'),
  ('PAY-000007','ORD-000007','credit_card',29.99,'USD','refunded','2024-04-01 13:30:00'),
  ('PAY-000008','ORD-000008','cod',14.99,'USD','completed','2024-04-20 10:30:00'),
  ('PAY-000009','ORD-000009','credit_card',89.99,'USD','completed','2024-05-01 08:30:00'),
  ('PAY-000010','ORD-000010','paypal',79.99,'USD','completed','2024-05-15 15:30:00');

INSERT INTO reviews VALUES
  ('REV-000001','ORD-000001','PROD-001','CUST-0001',5,'Excellent product!','2024-01-20 08:00:00'),
  ('REV-000002','ORD-000003','PROD-003','CUST-0003',4,'Good quality.','2024-02-15 09:00:00'),
  ('REV-000003','ORD-000004','PROD-004','CUST-0004',5,'Highly recommend!','2024-03-01 10:00:00'),
  ('REV-000004','ORD-000006','PROD-009','CUST-0005',3,'Average product.','2024-04-01 11:00:00'),
  ('REV-000005','ORD-000010','PROD-001','CUST-0005',4,'Happy with purchase.','2024-06-01 09:00:00');

INSERT INTO daily_sales VALUES
  ('2024-01-10', 79.99, 1, 79.99, 1, 1, 'Electronics', '2024-01-11 00:00:00'),
  ('2024-01-15', 12.99, 1, 12.99, 1, 1, 'Electronics', '2024-01-16 00:00:00'),
  ('2024-02-01', 59.98, 1, 59.98, 1, 2, 'Sports & Outdoors', '2024-02-02 00:00:00'),
  ('2024-02-14', 39.99, 1, 39.99, 1, 1, 'Books', '2024-02-15 00:00:00'),
  ('2024-03-15', 149.99, 1, 149.99, 1, 1, 'Sports & Outdoors', '2024-03-16 00:00:00'),
  ('2024-04-20', 14.99, 1, 14.99, 1, 1, 'Food & Grocery', '2024-04-21 00:00:00'),
  ('2024-05-15', 79.99, 1, 79.99, 1, 1, 'Electronics', '2024-05-16 00:00:00');
"""


@pytest.fixture(scope="session")
def in_memory_db() -> duckdb.DuckDBPyConnection:
    """In-memory DuckDB with full retail schema and seed rows."""
    conn = duckdb.connect(":memory:")
    for stmt in DDL_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    for stmt in SEED_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    yield conn
    conn.close()


@pytest.fixture(scope="session")
def test_catalog(in_memory_db):
    from pathlib import Path
    from features.catalog import load_catalog
    catalog_path = Path(__file__).resolve().parents[1] / "data" / "metadata" / "catalog.yaml"
    return load_catalog(catalog_path)


@pytest.fixture(scope="session")
def validator():
    from preprocessing.validator import validate_sql
    return validate_sql


@pytest.fixture(scope="session")
def seeded_executor_conn():
    """A dedicated DuckDB in-memory connection for the executor (separate from the
    history/test connection) so that closing the executor does not destroy the
    session-scoped in_memory_db used by other fixtures."""
    conn = duckdb.connect(":memory:")
    for stmt in DDL_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    for stmt in SEED_SQL.strip().split(";"):
        stmt = stmt.strip()
        if stmt:
            conn.execute(stmt)
    yield conn
    conn.close()


@pytest.fixture(scope="session")
def _session_executor(in_memory_db, seeded_executor_conn, test_catalog):
    """Session-scoped executor: history_conn=in_memory_db, _conn=seeded_executor_conn.

    Both underlying connections are session-scoped, so no test can close them
    prematurely by calling executor.close().
    """
    from preprocessing.query_executor import QueryExecutor

    executor = QueryExecutor(
        db_path=":memory:",
        history_conn=in_memory_db,
        strict_validation=True,
    )
    executor._conn = seeded_executor_conn
    yield executor
    # Don't call executor.close() — connections are owned by their own session fixtures


@pytest.fixture
def api_client(in_memory_db, test_catalog, _session_executor):
    """FastAPI TestClient with in-memory DuckDB injected via dependency overrides.

    Uses the session-scoped executor so teardown never closes the shared connection.
    """
    from contextlib import asynccontextmanager

    from api.main import create_app
    from api.dependencies import get_db, get_catalog, get_executor

    @asynccontextmanager
    async def test_lifespan(application):
        application.state.db = in_memory_db
        application.state.catalog = test_catalog
        application.state.executor = _session_executor
        yield

    test_app = create_app()
    test_app.router.lifespan_context = test_lifespan

    test_app.dependency_overrides[get_db] = lambda: in_memory_db
    test_app.dependency_overrides[get_catalog] = lambda: test_catalog
    test_app.dependency_overrides[get_executor] = lambda: _session_executor

    with TestClient(test_app) as client:
        yield client
