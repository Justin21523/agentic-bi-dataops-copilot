.PHONY: install sample-data etl evaluate api app test lint format docker-up docker-down clean help

PYTHON := uv run python
PYTEST  := uv run pytest

help:
	@echo "Agentic BI / DataOps Copilot — Make Targets"
	@echo "============================================="
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install:           ## Install all dependencies
	uv sync

sample-data:       ## Generate synthetic retail CSV files in data/sample/
	$(PYTHON) scripts/generate_sample_data.py

etl:               ## Load CSV data into DuckDB warehouse
	$(PYTHON) scripts/run_etl.py

evaluate:          ## Run Text2SQL benchmark and print metrics
	PYTHONPATH=src $(PYTHON) -m evaluation.evaluator

api:               ## Start FastAPI backend on :8000
	PYTHONPATH=src uv run uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

app:               ## Start Streamlit frontend on :8501
	PYTHONPATH=src uv run streamlit run src/app/streamlit_app.py --server.port 8501

test:              ## Run pytest test suite
	$(PYTEST) -v --tb=short

test-cov:          ## Run tests with coverage report
	$(PYTEST) --cov=src --cov-report=term-missing --cov-report=html

lint:              ## Lint with ruff
	uv run ruff check src/ tests/ scripts/

format:            ## Format with ruff
	uv run ruff format src/ tests/ scripts/

docker-up:         ## Build and start all Docker services (api + app)
	docker compose up --build -d
	@echo "API:  http://localhost:8000/health"
	@echo "App:  http://localhost:8501"

docker-down:       ## Stop all Docker services
	docker compose down

clean:             ## Remove generated files and caches
	rm -rf data/sample/*.csv data/warehouse.duckdb reports/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
