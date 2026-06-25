"""Integration tests for the FastAPI endpoints."""
import pytest


def test_health_endpoint(api_client):
    response = api_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "timestamp" in data
    assert data["db_status"] == "connected"


def test_metadata_tables_endpoint(api_client):
    response = api_client.get("/metadata/tables")
    assert response.status_code == 200
    tables = response.json()
    assert isinstance(tables, list)
    assert len(tables) > 0
    names = [t["name"] for t in tables]
    assert "customers" in names
    assert "orders" in names


def test_metadata_table_detail_endpoint(api_client):
    response = api_client.get("/metadata/tables/customers")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "customers"
    assert "columns" in data
    col_names = [c["name"] for c in data["columns"]]
    assert "customer_id" in col_names


def test_metadata_table_not_found(api_client):
    response = api_client.get("/metadata/tables/nonexistent_xyz")
    assert response.status_code == 404


def test_sql_validate_endpoint_blocks_drop(api_client):
    response = api_client.post("/query/sql/validate", json={"sql": "DROP TABLE customers"})
    assert response.status_code == 200
    data = response.json()
    assert data["is_safe"] is False
    assert len(data["issues"]) > 0


def test_sql_validate_endpoint_allows_safe_select(api_client):
    response = api_client.post(
        "/query/sql/validate",
        json={"sql": "SELECT customer_id, name FROM customers LIMIT 10"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_safe"] is True


def test_sql_execute_endpoint(api_client):
    response = api_client.post(
        "/query/sql/execute",
        json={"sql": "SELECT customer_id, name FROM customers LIMIT 3", "max_rows": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert "rows" in data
    assert "columns" in data
    assert len(data["rows"]) <= 3


def test_sql_execute_blocks_unsafe(api_client):
    response = api_client.post(
        "/query/sql/execute",
        json={"sql": "DELETE FROM customers WHERE 1=1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["error"] is not None


def test_nl_query_endpoint_with_known_pattern(api_client):
    response = api_client.post(
        "/query/nl",
        json={"question": "show me all customers", "max_rows": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert "sql" in data
    assert "is_safe" in data
    assert "rows" in data


def test_chart_recommend_endpoint(api_client):
    response = api_client.post(
        "/chart/recommend",
        json={
            "columns": [
                {"name": "date", "dtype": "DATE"},
                {"name": "revenue", "dtype": "DOUBLE"},
            ],
            "row_count": 100,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["chart_type"] == "line"
    assert data["x_col"] == "date"


def test_query_history_endpoint(api_client):
    response = api_client.get("/query/history")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


def test_dq_report_endpoint(api_client):
    response = api_client.get("/dq/report")
    assert response.status_code == 200
    data = response.json()
    assert "tables" in data
    assert "generated_at" in data
    assert len(data["tables"]) > 0
