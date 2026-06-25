from fastapi.testclient import TestClient

from lyrics_lab.api.main import app


def test_api_health(prepared_sample_data):
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
